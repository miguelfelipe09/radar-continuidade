"""Agregação por conjunto × competência.

Roda ao fim de cada ingestão, recalculando a tabela inteira. É recálculo
completo e não incremental de propósito: `cobertura_ok` compara cada
competência contra o mês de maior cobertura do conjunto de dados, então uma
carga nova pode mudar a classificação de competências antigas.

São ~95 mil linhas saindo de 25M de fatos — um GROUP BY, não um laço.
"""

import psycopg

AGREGAR = """
INSERT INTO conjunto_competencia (
    conjunto_id, distribuidora_cnpj, competencia_ano, competencia_mes,
    eventos, consumidores_afetados, consumidor_horas,
    consumidores_ativos, destoante, dec_aprox, fec_aprox, cobertura_ok, atualizado_em
)
WITH agregado AS (
    -- Sem filtro de expurgo, de propósito (ACHADOS §6): 2024-2025 não têm
    -- expurgo identificável, e filtrar só 2026 faria o ano recente parecer
    -- artificialmente melhor.
    SELECT
        conjunto_id,
        competencia_ano,
        competencia_mes,
        count(*)                                  AS eventos,
        sum(consumidores_afetados)::bigint        AS consumidores_afetados,
        sum(consumidores_afetados::double precision * duracao_minutos / 60.0)
                                                  AS consumidor_horas
    FROM interrupcoes
    GROUP BY 1, 2, 3
),
cobertura AS (
    SELECT competencia_ano, competencia_mes, count(*) AS conjuntos
    FROM agregado
    GROUP BY 1, 2
),
cobertura_flag AS (
    SELECT competencia_ano, competencia_mes,
           conjuntos >= 0.5 * max(conjuntos) OVER () AS cobertura_ok
    FROM cobertura
)
SELECT
    a.conjunto_id,
    c.distribuidora_cnpj,
    a.competencia_ano,
    a.competencia_mes,
    a.eventos,
    a.consumidores_afetados,
    a.consumidor_horas,
    ca.consumidores_ativos,
    coalesce(ca.destoante, false) AS destoante,
    CASE WHEN ca.consumidores_ativos > 0 AND NOT coalesce(ca.destoante, false)
         THEN a.consumidor_horas / ca.consumidores_ativos END AS dec_aprox,
    CASE WHEN ca.consumidores_ativos > 0 AND NOT coalesce(ca.destoante, false)
         THEN a.consumidores_afetados::double precision / ca.consumidores_ativos END AS fec_aprox,
    cf.cobertura_ok,
    now()
FROM agregado a
JOIN conjuntos c USING (conjunto_id)
JOIN cobertura_flag cf USING (competencia_ano, competencia_mes)
LEFT JOIN conjunto_consumidores_ativos ca
       USING (conjunto_id, competencia_ano, competencia_mes)
ON CONFLICT (conjunto_id, competencia_ano, competencia_mes) DO UPDATE SET
    distribuidora_cnpj    = EXCLUDED.distribuidora_cnpj,
    eventos               = EXCLUDED.eventos,
    consumidores_afetados = EXCLUDED.consumidores_afetados,
    consumidor_horas      = EXCLUDED.consumidor_horas,
    consumidores_ativos   = EXCLUDED.consumidores_ativos,
    destoante             = EXCLUDED.destoante,
    dec_aprox             = EXCLUDED.dec_aprox,
    fec_aprox             = EXCLUDED.fec_aprox,
    cobertura_ok          = EXCLUDED.cobertura_ok,
    atualizado_em         = EXCLUDED.atualizado_em
"""


def agregar(conn: psycopg.Connection) -> dict:
    """Recalcula conjunto_competencia. Devolve um resumo do que ficou lá."""
    with conn.cursor() as cur:
        cur.execute(AGREGAR)
        linhas = cur.rowcount

        cur.execute("""
            SELECT count(*) FILTER (WHERE NOT cobertura_ok),
                   count(*) FILTER (WHERE destoante),
                   count(*) FILTER (WHERE dec_aprox IS NULL)
            FROM conjunto_competencia
        """)
        sem_cobertura, destoantes, sem_indicador = cur.fetchone()

    conn.commit()
    return {
        "linhas": linhas,
        "sem_cobertura": sem_cobertura,
        "destoantes": destoantes,
        "sem_indicador": sem_indicador,
    }
