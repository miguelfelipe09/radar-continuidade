"""Registro das execuções em pipeline_runs.

Fica numa conexão própria em autocommit: se a transação da carga cair, a linha
da execução tem de sobreviver para contar o que aconteceu.
"""

import psycopg

from .transform import Counters


def abrir_run(conn: psycopg.Connection, arquivo: str, ano: int, layout: str,
              corte: tuple[int, int] | None) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO pipeline_runs
                (arquivo_origem, ano_referencia, layout_origem,
                 competencia_corte_ano, competencia_corte_mes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (arquivo, ano, layout, corte[0] if corte else None, corte[1] if corte else None),
        )
        return cur.fetchone()[0]


def fechar_run_sucesso(conn: psycopg.Connection, run_id: int, c: Counters,
                       inseridas: int, atualizadas: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE pipeline_runs SET
                finalizado_em                 = now(),
                status                        = 'sucesso',
                linhas_processadas            = %s,
                linhas_inseridas              = %s,
                linhas_atualizadas            = %s,
                linhas_duplicadas_descartadas = %s,
                linhas_sem_data_fim           = %s,
                linhas_sem_municipio          = %s,
                linhas_duracao_suspeita       = %s,
                linhas_alimentador_nulo       = %s
            WHERE id = %s
            """,
            (c.linhas_lidas, inseridas, atualizadas, c.duplicadas_descartadas,
             c.descartadas_sem_datas, c.sem_municipio, c.duracao_suspeita,
             c.alimentador_nulo, run_id),
        )


def fechar_run_falha(conn: psycopg.Connection, run_id: int, erro: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE pipeline_runs
            SET finalizado_em = now(), status = 'falha', erro = %s
            WHERE id = %s
            """,
            (erro[:2000], run_id),
        )
