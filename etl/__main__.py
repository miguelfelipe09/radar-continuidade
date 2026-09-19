"""CLI do ETL.

    python -m etl download --ano 2026
    python -m etl ingest --ano 2026
    python -m etl ingest --ano 2026 --ate-competencia 2026-07
    python -m etl ingest --ano 2024 --ano 2025 --ano 2026
    python -m etl ingest --ano 2026 --dry-run    # transforma e conta, sem gravar
"""

import argparse
import sys
import tempfile
import time
import traceback
from pathlib import Path

from . import aggregate, config, load, runs
from .download import DownloadError, baixar_ano
from .transform import layout_do_arquivo, transformar


def _competencia(texto: str) -> tuple[int, int]:
    try:
        ano, mes = texto.split("-")
        ano, mes = int(ano), int(mes)
        if not 1 <= mes <= 12:
            raise ValueError
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"competência inválida: {texto!r} (esperado AAAA-MM, ex. 2026-07)"
        ) from None
    return ano, mes


def _imprimir_contadores(res) -> None:
    c = res.counters
    print(f"  layout:                      {res.layout}")
    print(f"  linhas lidas:                {c.linhas_lidas:,}")
    print(f"  descartadas sem datas:       {c.descartadas_sem_datas:,}")
    print(f"  fora do corte:               {c.fora_do_corte:,}")
    print(f"  duplicadas descartadas:      {c.duplicadas_descartadas:,}")
    print(f"  alimentador nulo -> '':      {c.alimentador_nulo:,}")
    print(f"  sem município (malformado):  {c.sem_municipio:,}")
    print(f"  duração suspeita (>7 dias):  {c.duracao_suspeita:,}")
    print(f"  linhas resultantes:          {c.linhas_resultantes:,}")


def cmd_download(args) -> int:
    for ano in args.ano:
        try:
            baixar_ano(ano, forcar=args.forcar, limite_bytes=args.limite_bytes)
        except DownloadError as erro:
            print(f"ERRO: {erro}", file=sys.stderr)
            return 1
    return 0


def cmd_ingest(args) -> int:
    import psycopg

    corte = args.ate_competencia
    corte_num = corte[0] * 100 + corte[1] if corte else None
    workdir = Path(args.workdir) if args.workdir else Path(tempfile.gettempdir()) / "radar-etl"

    for ano in args.ano:
        arquivo = config.parquet_path(ano)
        if not arquivo.exists():
            print(f"ERRO: {arquivo} não existe. Rode: python -m etl download --ano {ano}",
                  file=sys.stderr)
            return 1

        print(f"\n=== {ano} ===")
        inicio = time.monotonic()

        if args.dry_run:
            res = transformar(arquivo, ano, corte_num, workdir)
            _imprimir_contadores(res)
            print(f"  (dry-run: nada gravado) {time.monotonic() - inicio:.1f}s")
            continue

        url = config.database_url()
        # Conexão separada, em autocommit, para a linha da execução sobreviver
        # a uma falha na transação da carga.
        with psycopg.connect(url, autocommit=True) as conn_runs:
            # A execução é aberta antes da transformação: uma falha ali também
            # precisa aparecer em pipeline_runs, com a era correta.
            layout = layout_do_arquivo(arquivo)
            run_id = runs.abrir_run(conn_runs, arquivo.name, ano, layout, corte)
            try:
                res = transformar(arquivo, ano, corte_num, workdir)
                _imprimir_contadores(res)

                with psycopg.connect(url) as conn:
                    numeros = load.carregar(conn, res)
                    # A agregação é recalculada inteira: cobertura_ok compara
                    # contra o mês de maior cobertura, que esta carga pode ter
                    # acabado de mudar.
                    resumo = aggregate.agregar(conn)

                runs.fechar_run_sucesso(
                    conn_runs, run_id, res.counters,
                    numeros["inseridas"], numeros["atualizadas"],
                )
                print(f"  inseridas:                   {numeros['inseridas']:,}")
                print(f"  atualizadas:                 {numeros['atualizadas']:,}")
                print(f"  inalteradas:                 {numeros['inalteradas']:,}")
                print(f"  reconfigurações registradas: {numeros['reconfiguracoes']:,}")
                print(f"  conjunto-competência:        {resumo['linhas']:,} "
                      f"({resumo['sem_indicador']:,} sem indicador)")
                print(f"  tempo:                       {time.monotonic() - inicio:.1f}s")
            except Exception as erro:
                runs.fechar_run_falha(conn_runs, run_id, f"{type(erro).__name__}: {erro}")
                traceback.print_exc()
                return 1

    return 0


def cmd_aggregate(args) -> int:
    """Recalcula a agregação sem recarregar os fatos."""
    import psycopg

    inicio = time.monotonic()
    with psycopg.connect(config.database_url()) as conn:
        resumo = aggregate.agregar(conn)
    print(f"  conjunto-competência:  {resumo['linhas']:,}")
    print(f"  sem cobertura:         {resumo['sem_cobertura']:,}")
    print(f"  destoantes:            {resumo['destoantes']:,}")
    print(f"  sem indicador:         {resumo['sem_indicador']:,}")
    print(f"  tempo:                 {time.monotonic() - inicio:.1f}s")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="etl", description="ETL das interrupções da ANEEL")
    sub = parser.add_subparsers(dest="comando", required=True)

    p_down = sub.add_parser("download", help="baixa o Parquet anual da ANEEL")
    p_down.add_argument("--ano", type=int, action="append", required=True)
    p_down.add_argument("--forcar", action="store_true", help="rebaixa mesmo se já existir")
    p_down.add_argument("--limite-bytes", type=int, metavar="N",
                        help="para depois de N bytes e descarta: valida a URL sem baixar tudo")
    p_down.set_defaults(func=cmd_download)

    p_ing = sub.add_parser("ingest", help="transforma e carrega no Postgres")
    p_ing.add_argument("--ano", type=int, action="append", required=True)
    p_ing.add_argument("--ate-competencia", type=_competencia, metavar="AAAA-MM",
                       help="ignora competências acima desta")
    p_ing.add_argument("--dry-run", action="store_true", help="transforma e conta, sem gravar")
    p_ing.add_argument("--workdir", help="diretório dos arquivos intermediários")
    p_ing.set_defaults(func=cmd_ingest)

    p_agg = sub.add_parser("aggregate", help="recalcula conjunto_competencia")
    p_agg.set_defaults(func=cmd_aggregate)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
