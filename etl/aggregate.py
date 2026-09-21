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
    consumidores_ativos, destoante, dec_aprox, fec_aprox, cobertura_ok,
    cobertura_distribuidora_ok, concentracao_top5, atualizado_em
)
WITH concentracao AS (
    -- Quanto do consumidor-hora vem dos 5 eventos de maior impacto. Alta
    -- concentração indica indicador apoiado em meia dúzia de registros.
    SELECT conjunto_id, competencia_ano, competencia_mes,
           sum(ch) FILTER (WHERE posicao <= 5) / nullif(sum(ch), 0) AS top5
      FROM (
        SELECT conjunto_id, competencia_ano, competencia_mes,
               consumidores_afetados::double precision * duracao_minutos / 60.0 AS ch,
               row_number() OVER (
                   PARTITION BY conjunto_id, competencia_ano, competencia_mes
                   ORDER BY consumidores_afetados::double precision * duracao_minutos DESC
               ) AS posicao
          FROM interrupcoes
      ) e
     GROUP BY 1, 2, 3
),
agregado AS (
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
),
-- Mesma regra no grão da distribuidora. O típico é a mediana dos conjuntos
-- que ela reporta por mês, e não o máximo: um mês com conjuntos a mais (após
-- redesenho, por exemplo) não deve rebaixar os demais.
cobertura_dist AS (
    SELECT c.distribuidora_cnpj, a.competencia_ano, a.competencia_mes, count(*) AS conjuntos
    FROM agregado a
    JOIN conjuntos c USING (conjunto_id)
    GROUP BY 1, 2, 3
),
tipico_dist AS (
    SELECT distribuidora_cnpj,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY conjuntos) AS tipico
    FROM cobertura_dist
    GROUP BY 1
),
cobertura_dist_flag AS (
    SELECT cd.distribuidora_cnpj, cd.competencia_ano, cd.competencia_mes,
           cd.conjuntos >= 0.5 * t.tipico AS cobertura_distribuidora_ok
    FROM cobertura_dist cd
    JOIN tipico_dist t USING (distribuidora_cnpj)
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
    cdf.cobertura_distribuidora_ok,
    con.top5,
    now()
FROM agregado a
JOIN conjuntos c USING (conjunto_id)
JOIN cobertura_flag cf USING (competencia_ano, competencia_mes)
JOIN cobertura_dist_flag cdf
  ON cdf.distribuidora_cnpj = c.distribuidora_cnpj
 AND cdf.competencia_ano    = a.competencia_ano
 AND cdf.competencia_mes    = a.competencia_mes
LEFT JOIN concentracao con
       ON con.conjunto_id     = a.conjunto_id
      AND con.competencia_ano = a.competencia_ano
      AND con.competencia_mes = a.competencia_mes
LEFT JOIN conjunto_consumidores_ativos ca
       ON ca.conjunto_id     = a.conjunto_id
      AND ca.competencia_ano = a.competencia_ano
      AND ca.competencia_mes = a.competencia_mes
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
    cobertura_distribuidora_ok = EXCLUDED.cobertura_distribuidora_ok,
    concentracao_top5     = EXCLUDED.concentracao_top5,
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
