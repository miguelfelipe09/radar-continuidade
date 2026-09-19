"""Carga no Postgres: staging por COPY e upsert por chave natural.

A fonte republica o arquivo anual inteiro todo mês e as distribuidoras enviam
retificações, então carga não é inserção: é upsert com detecção de linha
alterada. Reprocessar o mesmo arquivo não muda nada; reprocessar um arquivo
atualizado corrige o que mudou e diz quantas linhas mudaram.
"""

from pathlib import Path

import psycopg

from .config import UF_POR_PREFIXO
from .transform import COLUNAS_FATO, TransformResult

DDL_STAGING_FATOS = """
CREATE TEMP TABLE stg_interrupcoes (
    layout_origem          text,
    distribuidora_cnpj     bigint,
    cod_interrupcao        text,
    conjunto_id            bigint,
    alimentador            text,
    dat_inicio             timestamp,
    seq                    integer,
    dat_fim                timestamp,
    competencia_ano        smallint,
    competencia_mes        smallint,
    consumidores_afetados  integer,
    municipio_ibge         integer,
    tipo                   text,
    causa_bruta            text,
    motivo_expurgo         text,
    cod_evento             text,
    cod_ocorrencia         text
) ON COMMIT DROP
"""

DDL_STAGING_ATIVOS = """
CREATE TEMP TABLE stg_ativos (
    conjunto_id          bigint,
    competencia_ano      smallint,
    competencia_mes      smallint,
    consumidores_ativos  integer,
    destoante            boolean
) ON COMMIT DROP
"""

# Colunas comparadas para decidir se a linha mudou. Ficam de fora a chave
# natural (que não muda por definição) e as colunas GENERATED.
COLUNAS_MUTAVEIS = [
    "layout_origem",
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

UPSERT_FATOS = """
WITH upsert AS (
    INSERT INTO interrupcoes ({colunas})
    SELECT {colunas} FROM stg_interrupcoes
    ON CONFLICT ON CONSTRAINT interrupcoes_chave_natural DO UPDATE SET
        {atribuicoes}
    WHERE ({atuais}) IS DISTINCT FROM ({novos})
    RETURNING (xmax = 0) AS inserida
)
SELECT count(*) FILTER (WHERE inserida)     AS inseridas,
       count(*) FILTER (WHERE NOT inserida) AS atualizadas
FROM upsert
"""


def _sql_upsert_fatos() -> str:
    return UPSERT_FATOS.format(
        colunas=", ".join(COLUNAS_FATO),
        atribuicoes=",\n        ".join(f"{c} = EXCLUDED.{c}" for c in COLUNAS_MUTAVEIS),
        atuais=", ".join(f"interrupcoes.{c}" for c in COLUNAS_MUTAVEIS),
        novos=", ".join(f"EXCLUDED.{c}" for c in COLUNAS_MUTAVEIS),
    )


def _copiar_csv(cur: psycopg.Cursor, tabela: str, caminho: Path) -> None:
    """Carga em massa por COPY, lendo o CSV em blocos."""
    with cur.copy(f"COPY {tabela} FROM STDIN WITH (FORMAT csv)") as copy:
        with open(caminho, "rb") as arquivo:
            while bloco := arquivo.read(1024 * 1024):
                copy.write(bloco)


def _gravar_dimensoes(cur: psycopg.Cursor, res: TransformResult) -> None:
    cur.executemany(
        """
        INSERT INTO distributors (cnpj, sigla, nome) VALUES (%s, %s, %s)
        ON CONFLICT (cnpj) DO UPDATE SET sigla = EXCLUDED.sigla, nome = EXCLUDED.nome
        """,
        res.distribuidoras,
    )

    cur.executemany(
        """
        INSERT INTO conjuntos (conjunto_id, distribuidora_cnpj, nome) VALUES (%s, %s, %s)
        ON CONFLICT (conjunto_id) DO UPDATE SET
            distribuidora_cnpj = EXCLUDED.distribuidora_cnpj,
            nome = EXCLUDED.nome
        """,
        res.conjuntos,
    )

    # A UF sai dos 2 primeiros dígitos do código IBGE (ACHADOS §10).
    municipios = []
    for codigo in res.municipios:
        prefixo = codigo // 100_000
        uf = UF_POR_PREFIXO.get(prefixo)
        if uf is None:
            raise RuntimeError(f"código IBGE {codigo} tem prefixo de UF desconhecido: {prefixo}")
        municipios.append((codigo, uf))

    if municipios:
        cur.executemany(
            """
            INSERT INTO municipalities (ibge_code, uf) VALUES (%s, %s)
            ON CONFLICT (ibge_code) DO UPDATE SET uf = EXCLUDED.uf
            """,
            municipios,
        )


def _gravar_ativos(cur: psycopg.Cursor, res: TransformResult) -> None:
    cur.execute(DDL_STAGING_ATIVOS)
    _copiar_csv(cur, "stg_ativos", res.csv_ativos)
    cur.execute("""
        INSERT INTO conjunto_consumidores_ativos
            (conjunto_id, competencia_ano, competencia_mes, consumidores_ativos, destoante)
        SELECT conjunto_id, competencia_ano, competencia_mes, consumidores_ativos, destoante
        FROM stg_ativos
        ON CONFLICT (conjunto_id, competencia_ano, competencia_mes) DO UPDATE SET
            consumidores_ativos = EXCLUDED.consumidores_ativos,
            destoante = EXCLUDED.destoante
    """)


def _gravar_reconfiguracoes(cur: psycopg.Cursor) -> int:
    """Registra a competência em que o conjunto mudou de patamar.

    O conjunto-mês destoante é sintoma de redesenho de conjunto (ACHADOS §4);
    a vigência é a primeira competência normal depois do último mês destoante.
    """
    cur.execute("""
        WITH ultimo_destoante AS (
            SELECT conjunto_id, competencia_ano, max(competencia_mes) AS mes
            FROM conjunto_consumidores_ativos
            WHERE destoante
            GROUP BY 1, 2
        ),
        vigencia AS (
            SELECT d.conjunto_id, d.competencia_ano, min(a.competencia_mes) AS competencia_mes
            FROM ultimo_destoante d
            JOIN conjunto_consumidores_ativos a
              ON a.conjunto_id     = d.conjunto_id
             AND a.competencia_ano = d.competencia_ano
             AND a.competencia_mes > d.mes
             AND NOT a.destoante
            GROUP BY 1, 2
        )
        INSERT INTO conjunto_reconfiguracoes
            (conjunto_id, competencia_ano, competencia_mes, observacao)
        SELECT conjunto_id, competencia_ano, competencia_mes,
               'Derivada pelo ETL: consumidores ativos mudam de patamar nesta competência'
        FROM vigencia
        ON CONFLICT (conjunto_id, competencia_ano, competencia_mes) DO NOTHING
    """)
    return cur.rowcount


def carregar(conn: psycopg.Connection, res: TransformResult) -> dict:
    """Aplica a carga inteira numa transação. Devolve os contadores do banco."""
    with conn.cursor() as cur:
        cur.execute(DDL_STAGING_FATOS)
        _copiar_csv(cur, "stg_interrupcoes", res.csv_fatos)

        # Dimensões antes do fato: o fato não tem chave estrangeira, mas a
        # integridade continua sendo responsabilidade do ETL.
        _gravar_dimensoes(cur, res)

        cur.execute(_sql_upsert_fatos())
        inseridas, atualizadas = cur.fetchone()

        _gravar_ativos(cur, res)
        reconfiguracoes = _gravar_reconfiguracoes(cur)

    conn.commit()
    return {
        "inseridas": inseridas,
        "atualizadas": atualizadas,
        "inalteradas": res.counters.linhas_resultantes - inseridas - atualizadas,
        "reconfiguracoes": reconfiguracoes,
    }
