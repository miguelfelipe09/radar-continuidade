"""Transformação dos Parquet da ANEEL para o modelo canônico, em DuckDB.

Dois adaptadores — `legacy` (2024-2025) e `new` (2026+) — produzem as mesmas
colunas. Daí para frente o tratamento é comum: descarte por datas ausentes,
corte por competência, chave natural e contadores.

Nada é carregado em memória no processo Python: o DuckDB lê o Parquet, grava
a saída canônica em CSV e só os números voltam para cá.
"""

from dataclasses import dataclass, field
from pathlib import Path

import duckdb

from .config import DURACAO_SUSPEITA_MINUTOS, IBGE_MAX, IBGE_MIN

# Colunas da saída canônica, na ordem do CSV e do staging.
COLUNAS_FATO = [
    "layout_origem",
    "distribuidora_cnpj",
    "cod_interrupcao",
    "conjunto_id",
    "alimentador",
    "dat_inicio",
    "seq",
    "dat_fim",
    "competencia_ano",
    "competencia_mes",
    "consumidores_afetados",
    "municipio_ibge",
    "tipo",
    "causa_bruta",
    "motivo_expurgo",
    "cod_evento",
    "cod_ocorrencia",
]

# --- adaptadores -----------------------------------------------------------
# Cada um traduz o layout do ano para os mesmos nomes canônicos. O que não
# existe na era vira NULL explícito, para as duas pontas terem o mesmo formato.

SRC_LEGACY = """
    SELECT
        CAST(NumCPFCNPJ                    AS BIGINT)    AS distribuidora_cnpj,
        CAST(SigAgente                     AS VARCHAR)   AS distribuidora_sigla,
        CAST(NomAgenteRegulado             AS VARCHAR)   AS distribuidora_nome,
        CAST(IdeConjuntoUnidadeConsumidora AS BIGINT)    AS conjunto_id,
        CAST(DscConjuntoUnidadeConsumidora AS VARCHAR)   AS conjunto_nome,
        CAST(NumOrdemInterrupcao           AS VARCHAR)   AS cod_interrupcao,
        CAST(DscAlimentadorSubestacao      AS VARCHAR)   AS alimentador_bruto,
        CAST(DatInicioInterrupcao          AS TIMESTAMP) AS dat_inicio,
        CAST(DatFimInterrupcao             AS TIMESTAMP) AS dat_fim,
        CAST(NumUnidadeConsumidora         AS INTEGER)   AS consumidores_afetados,
        CAST(NumConsumidorConjunto         AS INTEGER)   AS consumidores_ativos,
        CAST(DscTipoInterrupcao            AS VARCHAR)   AS tipo,
        CAST(DscFatoGeradorInterrupcao     AS VARCHAR)   AS causa_bruta,
        -- competência derivada da data de início: o layout antigo não a traz
        CAST(year(CAST(DatInicioInterrupcao AS TIMESTAMP))  AS SMALLINT) AS competencia_ano,
        CAST(month(CAST(DatInicioInterrupcao AS TIMESTAMP)) AS SMALLINT) AS competencia_mes,
        CAST(NULL AS BIGINT)  AS municipio_bruto,
        CAST(NULL AS VARCHAR) AS motivo_expurgo,
        CAST(NULL AS VARCHAR) AS cod_evento,
        CAST(NULL AS VARCHAR) AS cod_ocorrencia
    FROM read_parquet('{arquivo}')
"""

SRC_NEW = """
    SELECT
        CAST(NumCNPJDistribuidora          AS BIGINT)    AS distribuidora_cnpj,
        CAST(SigAgente                     AS VARCHAR)   AS distribuidora_sigla,
        CAST(NomAgente                     AS VARCHAR)   AS distribuidora_nome,
        CAST(CodConjUnidadeConsumidora     AS BIGINT)    AS conjunto_id,
        CAST(DscConjuntoUnidadeConsumidora AS VARCHAR)   AS conjunto_nome,
        CAST(CodInterrupcao                AS VARCHAR)   AS cod_interrupcao,
        CAST(CodAlimentador                AS VARCHAR)   AS alimentador_bruto,
        CAST(DatInicioInterrupcao          AS TIMESTAMP) AS dat_inicio,
        CAST(DatFimInterrupcao             AS TIMESTAMP) AS dat_fim,
        CAST(QtdConsumidoresAfetados       AS INTEGER)   AS consumidores_afetados,
        CAST(QtdConsumidoresAtivos         AS INTEGER)   AS consumidores_ativos,
        CAST(DscFatoGeradorTipo            AS VARCHAR)   AS tipo,
        -- a taxonomia de 4 níveis vira um texto só; não normalizamos (ACHADOS §7)
        concat_ws(' - ', DscFatoGeradorOrigem, DscFatoGeradorTipo,
                         DscFatoGeradorCausa, DscFatoGeradorDetalhe)    AS causa_bruta,
        CAST(AnoCompetencia AS SMALLINT) AS competencia_ano,
        CAST(MesCompetencia AS SMALLINT) AS competencia_mes,
        CAST(CodMunicipioIBGE AS BIGINT) AS municipio_bruto,
        CAST(DscMotivoExpurgo AS VARCHAR) AS motivo_expurgo,
        CAST(CodEvento        AS VARCHAR) AS cod_evento,
        CAST(CodOcorrencia    AS VARCHAR) AS cod_ocorrencia
    FROM read_parquet('{arquivo}')
"""


@dataclass
class Counters:
    linhas_lidas: int = 0
    descartadas_sem_datas: int = 0
    fora_do_corte: int = 0
    duplicadas_descartadas: int = 0
    alimentador_nulo: int = 0
    sem_municipio: int = 0
    duracao_suspeita: int = 0
    linhas_resultantes: int = 0


@dataclass
class TransformResult:
    ano: int
    layout: str
    counters: Counters
    csv_fatos: Path
    csv_ativos: Path
    distribuidoras: list = field(default_factory=list)
    conjuntos: list = field(default_factory=list)
    municipios: list = field(default_factory=list)


def detectar_layout(con: duckdb.DuckDBPyConnection, arquivo: Path) -> str:
    """Decide o adaptador pelas colunas do arquivo, não pelo ano.

    Se a ANEEL mudar o layout de novo, o erro aparece aqui e não no meio da
    carga.
    """
    colunas = {
        linha[0]
        for linha in con.execute(
            f"SELECT name FROM parquet_schema('{_escapar(arquivo)}')"
        ).fetchall()
    }
    if "AnoCompetencia" in colunas and "CodInterrupcao" in colunas:
        return "new"
    if "NumOrdemInterrupcao" in colunas and "IdeConjuntoUnidadeConsumidora" in colunas:
        return "legacy"
    raise RuntimeError(
        f"layout não reconhecido em {arquivo.name}; colunas: {sorted(colunas)}"
    )


def _escapar(caminho: Path) -> str:
    return str(caminho).replace("\\", "/").replace("'", "''")


def transformar(arquivo: Path, ano: int, corte: int | None, workdir: Path) -> TransformResult:
    """Roda a transformação inteira e devolve contadores e arquivos de saída.

    `corte` é a competência máxima no formato AAAAMM, ou None para o arquivo
    inteiro.
    """
    workdir.mkdir(parents=True, exist_ok=True)
    banco = workdir / f"transform-{ano}.duckdb"
    banco.unlink(missing_ok=True)

    con = duckdb.connect(str(banco))
    try:
        layout = detectar_layout(con, arquivo)
        src = (SRC_NEW if layout == "new" else SRC_LEGACY).format(arquivo=_escapar(arquivo))
        c = Counters()

        con.execute(f"CREATE VIEW src AS {src}")

        c.linhas_lidas = con.execute("SELECT count(*) FROM src").fetchone()[0]

        # 1) Sem data de início ou de fim não há consumidor-hora calculável
        #    (ACHADOS §9). Descarte, não correção.
        con.execute("""
            CREATE VIEW com_datas AS
            SELECT * FROM src
            WHERE dat_inicio IS NOT NULL AND dat_fim IS NOT NULL
        """)
        c.descartadas_sem_datas = c.linhas_lidas - con.execute(
            "SELECT count(*) FROM com_datas"
        ).fetchone()[0]

        # 2) Corte por competência, não por data de início (ACHADOS §8). É o que
        #    permite demonstrar a carga incremental.
        if corte is None:
            con.execute("CREATE VIEW no_corte AS SELECT * FROM com_datas")
            c.fora_do_corte = 0
        else:
            con.execute(f"""
                CREATE VIEW no_corte AS
                SELECT * FROM com_datas
                WHERE competencia_ano * 100 + competencia_mes <= {corte}
            """)
            c.fora_do_corte = con.execute(
                "SELECT count(*) FROM com_datas"
            ).fetchone()[0] - con.execute(
                "SELECT count(*) FROM no_corte"
            ).fetchone()[0]

        # 3) Chave natural. As duas eras chegam com seq; o que muda é como ele
        #    é obtido.
        if layout == "new":
            # Dedup determinística: a linha de maior precisão vence, desempate
            # pelo fim mais tardio (ACHADOS §5).
            con.execute("""
                CREATE TABLE stage AS
                SELECT * EXCLUDE (rn), 1 AS seq FROM (
                    SELECT *,
                        row_number() OVER (
                            PARTITION BY distribuidora_cnpj, cod_interrupcao, dat_inicio
                            ORDER BY CASE WHEN second(dat_fim) <> 0 THEN 0 ELSE 1 END,
                                     dat_fim DESC
                        ) AS rn
                    FROM no_corte
                ) WHERE rn = 1
            """)
            c.duplicadas_descartadas = con.execute(
                "SELECT count(*) FROM no_corte"
            ).fetchone()[0] - con.execute("SELECT count(*) FROM stage").fetchone()[0]
        else:
            # Nenhuma combinação de colunas é única no layout antigo: 3% das
            # ocorrências se desdobram em até 81 linhas. O seq as separa
            # (ACHADOS §5). A ordenação de ACHADOS é (dat_fim, afetados); os
            # demais campos entram só como desempate, para a numeração ser
            # estável entre execuções — é o que sustenta a idempotência.
            con.execute("""
                CREATE TABLE stage AS
                SELECT *,
                    row_number() OVER (
                        PARTITION BY distribuidora_cnpj, cod_interrupcao,
                                     conjunto_id, alimentador_bruto, dat_inicio
                        ORDER BY dat_fim, consumidores_afetados,
                                 consumidores_ativos, tipo, causa_bruta
                    ) AS seq
                FROM no_corte
            """)
            c.duplicadas_descartadas = 0

        c.linhas_resultantes = con.execute("SELECT count(*) FROM stage").fetchone()[0]

        # 4) Contadores das demais regras de tratamento.
        c.alimentador_nulo = con.execute(
            "SELECT count(*) FROM stage WHERE alimentador_bruto IS NULL"
        ).fetchone()[0]
        # Só conta código presente e malformado. No layout antigo o campo não
        # existe, então o contador é 0 — ausência da era não é dado faltando.
        c.sem_municipio = con.execute(f"""
            SELECT count(*) FROM stage
            WHERE municipio_bruto IS NOT NULL
              AND municipio_bruto NOT BETWEEN {IBGE_MIN} AND {IBGE_MAX}
        """).fetchone()[0]
        c.duracao_suspeita = con.execute(f"""
            SELECT count(*) FROM stage
            WHERE date_diff('minute', dat_inicio, dat_fim) > {DURACAO_SUSPEITA_MINUTOS}
        """).fetchone()[0]

        # 5) Saída canônica. Aspas forçadas nos textos para o COPY do Postgres
        #    distinguir string vazia (alimentador ausente) de NULL.
        csv_fatos = workdir / f"fatos-{ano}.csv"
        con.execute(f"""
            COPY (
                SELECT
                    '{layout}'                       AS layout_origem,
                    distribuidora_cnpj,
                    cod_interrupcao,
                    conjunto_id,
                    COALESCE(alimentador_bruto, '')  AS alimentador,
                    dat_inicio,
                    seq,
                    dat_fim,
                    competencia_ano,
                    competencia_mes,
                    consumidores_afetados,
                    CASE WHEN municipio_bruto BETWEEN {IBGE_MIN} AND {IBGE_MAX}
                         THEN municipio_bruto END    AS municipio_ibge,
                    tipo,
                    causa_bruta,
                    motivo_expurgo,
                    cod_evento,
                    cod_ocorrencia
                FROM stage
            ) TO '{_escapar(csv_fatos)}' (FORMAT CSV, HEADER false, FORCE_QUOTE *)
        """)

        # 6) Consumidores ativos: atributo do conjunto-mês (ACHADOS §4).
        #    Moda do mês, com desempate determinístico; destoante marca o
        #    conjunto-mês que foge 3x da mediana anual do próprio conjunto.
        csv_ativos = workdir / f"ativos-{ano}.csv"
        con.execute(f"""
            COPY (
                WITH contagem AS (
                    SELECT conjunto_id, competencia_ano, competencia_mes,
                           consumidores_ativos, count(*) AS n
                    FROM stage
                    WHERE consumidores_ativos IS NOT NULL
                    GROUP BY 1, 2, 3, 4
                ),
                moda AS (
                    SELECT conjunto_id, competencia_ano, competencia_mes, consumidores_ativos
                    FROM (
                        SELECT *, row_number() OVER (
                            PARTITION BY conjunto_id, competencia_ano, competencia_mes
                            ORDER BY n DESC, consumidores_ativos DESC) AS rn
                        FROM contagem
                    ) WHERE rn = 1
                ),
                mediana AS (
                    SELECT conjunto_id, competencia_ano,
                           median(consumidores_ativos) AS mediana_anual
                    FROM moda GROUP BY 1, 2
                )
                SELECT m.conjunto_id, m.competencia_ano, m.competencia_mes,
                       m.consumidores_ativos,
                       md.mediana_anual > 0 AND (
                           m.consumidores_ativos > 3 * md.mediana_anual OR
                           3 * m.consumidores_ativos < md.mediana_anual
                       ) AS destoante
                FROM moda m
                JOIN mediana md USING (conjunto_id, competencia_ano)
            ) TO '{_escapar(csv_ativos)}' (FORMAT CSV, HEADER false, FORCE_QUOTE *)
        """)

        # 7) Dimensões. São poucas linhas, então voltam para o Python.
        distribuidoras = con.execute("""
            SELECT distribuidora_cnpj, max(distribuidora_sigla), max(distribuidora_nome)
            FROM stage GROUP BY 1 ORDER BY 1
        """).fetchall()

        # A chave primária de coluna única em conjuntos depende de o código não
        # colidir entre distribuidoras (ACHADOS §13). A premissa é verificada a
        # cada carga: se cair, a carga para aqui em vez de gravar dado errado.
        colisoes = con.execute("""
            SELECT conjunto_id, count(DISTINCT distribuidora_cnpj) AS n
            FROM stage GROUP BY 1 HAVING n > 1
        """).fetchall()
        if colisoes:
            raise RuntimeError(
                f"{len(colisoes)} conjunto(s) aparecem sob mais de uma distribuidora "
                f"(ex.: {colisoes[0][0]}). A chave de conjuntos precisa virar composta."
            )

        conjuntos = con.execute("""
            SELECT conjunto_id, max(distribuidora_cnpj), max(conjunto_nome)
            FROM stage GROUP BY 1 ORDER BY 1
        """).fetchall()

        municipios = con.execute(f"""
            SELECT DISTINCT municipio_bruto
            FROM stage
            WHERE municipio_bruto BETWEEN {IBGE_MIN} AND {IBGE_MAX}
            ORDER BY 1
        """).fetchall()

        return TransformResult(
            ano=ano,
            layout=layout,
            counters=c,
            csv_fatos=csv_fatos,
            csv_ativos=csv_ativos,
            distribuidoras=distribuidoras,
            conjuntos=conjuntos,
            municipios=[m[0] for m in municipios],
        )
    finally:
        con.close()
