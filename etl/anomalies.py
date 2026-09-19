"""Detecção de anomalia por mediana + IQR sobre a história do conjunto.

Média e desvio padrão não servem: são destruídos pelo próprio outlier que se
quer detectar. Mediana e IQR não.

A sazonalidade é forte e medida (ACHADOS §3) — o DEC mediano vai de 1,59 em
janeiro a 0,72 em junho —, então comparar contra o mês anterior acusaria a
estação, não a rede. Em vez de restringir o baseline ao mesmo mês de anos
anteriores (2 pontos) ou ao mesmo mês mais os adjacentes (6 pontos), a série
inteira do conjunto é dessazonalizada por um índice mensal global e usada por
completo (~29 pontos).

O índice é calculado **só sobre competências anteriores à avaliada**: incluir
a competência-alvo deixaria um evento nacional (um apagão regional, digamos)
inflar o índice do próprio mês que deveria ser detectado.
"""

import psycopg

# Pontos mínimos de baseline: um ano de história.
MINIMO_PONTOS = 12
# Denominador mínimo. Não é filtro de tamanho — conjuntos rurais pequenos e
# legítimos (MIMOSO, 711 ativos) são justamente o que a fila deve pescar. É
# guarda contra denominador quebrado: 14 conjunto-mês na base têm de 1 a 39
# consumidores ativos.
MINIMO_ATIVOS = 100
# Acima disto o baseline é considerado esburacado (de ~30 competências).
MAXIMO_BURACOS = 6

DETECTAR = """
INSERT INTO anomalias (
    pipeline_run_id, conjunto_id, competencia_ano, competencia_mes, distribuidora_cnpj,
    situacao, dec_aprox, dec_normalizado, consumidores_afetados, consumidores_ativos,
    eventos, baseline_pontos, baseline_meses_faltando, baseline_mediana,
    baseline_q1, baseline_q3, baseline_iqr, limite_alerta, desvio_iqr,
    severidade, reconfiguracao, baseline_esburacado
)
WITH alvo AS (
    SELECT %(ano)s::smallint AS ano, %(mes)s::smallint AS mes
),
-- Tudo que é anterior à competência avaliada. Base do índice e do baseline.
anterior AS (
    SELECT cc.*
    FROM conjunto_competencia cc, alvo a
    WHERE cc.cobertura_ok
      AND cc.dec_aprox IS NOT NULL
      AND (cc.competencia_ano * 100 + cc.competencia_mes) < (a.ano * 100 + a.mes)
),
-- Índice sazonal: mediana do mês dividida pela mediana geral, ambas apuradas
-- apenas no passado.
indice AS (
    SELECT competencia_mes,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY dec_aprox)
               / (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dec_aprox) FROM anterior)
           AS fator
    FROM anterior
    GROUP BY 1
),
competencias_possiveis AS (
    SELECT count(DISTINCT (competencia_ano, competencia_mes)) AS total FROM anterior
),
-- Conjunto-mês destoante não entra no baseline: denominador não confiável.
historico AS (
    SELECT an.conjunto_id, an.dec_aprox / i.fator AS dec_norm
    FROM anterior an
    JOIN indice i USING (competencia_mes)
    WHERE NOT an.destoante
),
baseline AS (
    SELECT conjunto_id,
           count(*)::smallint AS pontos,
           percentile_cont(0.50) WITHIN GROUP (ORDER BY dec_norm) AS mediana,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY dec_norm) AS q1,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY dec_norm) AS q3
    FROM historico
    GROUP BY 1
),
observado AS (
    SELECT cc.*, i.fator,
           cc.dec_aprox / i.fator AS dec_norm
    FROM conjunto_competencia cc
    JOIN alvo a ON a.ano = cc.competencia_ano AND a.mes = cc.competencia_mes
    LEFT JOIN indice i USING (competencia_mes)
),
avaliacao AS (
    SELECT
        o.conjunto_id,
        o.competencia_ano,
        o.competencia_mes,
        o.distribuidora_cnpj,
        o.dec_aprox,
        o.dec_norm,
        o.consumidores_afetados,
        o.consumidores_ativos,
        o.eventos,
        b.pontos,
        (SELECT total FROM competencias_possiveis) - coalesce(b.pontos, 0) AS meses_faltando,
        b.mediana,
        b.q1,
        b.q3,
        b.q3 - b.q1 AS iqr,
        CASE WHEN o.conjunto_id = 0            THEN 'conjunto_invalido'
             WHEN NOT o.cobertura_ok           THEN 'cobertura'
             WHEN o.destoante                  THEN 'destoante'
             WHEN o.dec_aprox IS NULL
               OR o.consumidores_ativos < %(minimo_ativos)s THEN 'denominador'
             WHEN coalesce(b.pontos, 0) < %(minimo_pontos)s THEN 'sem_baseline'
             ELSE 'avaliado'
        END AS situacao,
        EXISTS (
            SELECT 1 FROM conjunto_reconfiguracoes r
            WHERE r.conjunto_id = o.conjunto_id
              AND (r.competencia_ano * 100 + r.competencia_mes)
                  <= (o.competencia_ano * 100 + o.competencia_mes)
        ) AS reconfiguracao
    FROM observado o
    LEFT JOIN baseline b USING (conjunto_id)
)
SELECT
    %(run_id)s,
    conjunto_id,
    competencia_ano,
    competencia_mes,
    distribuidora_cnpj,
    situacao,
    dec_aprox,
    dec_norm,
    consumidores_afetados,
    consumidores_ativos,
    eventos,
    pontos,
    meses_faltando,
    mediana,
    q1,
    q3,
    iqr,
    q3 + 1.5 * iqr AS limite_alerta,
    CASE WHEN iqr > 0 THEN (dec_norm - mediana) / iqr END AS desvio_iqr,
    CASE WHEN situacao <> 'avaliado' THEN NULL
         -- Tukey, só para cima: conjunto muito abaixo do próprio baseline não
         -- é fila de investigação.
         WHEN dec_norm > q3 + 3.0 * iqr THEN 'alta'
         WHEN dec_norm > q3 + 1.5 * iqr THEN 'moderada'
         WHEN dec_norm < q1 - 1.5 * iqr THEN 'queda'
         ELSE 'normal'
    END AS severidade,
    reconfiguracao,
    meses_faltando > %(maximo_buracos)s AS baseline_esburacado
FROM avaliacao
ON CONFLICT (pipeline_run_id, conjunto_id, competencia_ano, competencia_mes)
DO UPDATE SET
    situacao                = EXCLUDED.situacao,
    dec_aprox               = EXCLUDED.dec_aprox,
    dec_normalizado         = EXCLUDED.dec_normalizado,
    consumidores_afetados   = EXCLUDED.consumidores_afetados,
    consumidores_ativos     = EXCLUDED.consumidores_ativos,
    eventos                 = EXCLUDED.eventos,
    baseline_pontos         = EXCLUDED.baseline_pontos,
    baseline_meses_faltando = EXCLUDED.baseline_meses_faltando,
    baseline_mediana        = EXCLUDED.baseline_mediana,
    baseline_q1             = EXCLUDED.baseline_q1,
    baseline_q3             = EXCLUDED.baseline_q3,
    baseline_iqr            = EXCLUDED.baseline_iqr,
    limite_alerta           = EXCLUDED.limite_alerta,
    desvio_iqr              = EXCLUDED.desvio_iqr,
    severidade              = EXCLUDED.severidade,
    reconfiguracao          = EXCLUDED.reconfiguracao,
    baseline_esburacado     = EXCLUDED.baseline_esburacado,
    criado_em               = now()
"""


def competencia_mais_recente(conn: psycopg.Connection) -> tuple[int, int]:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT competencia_ano, competencia_mes
            FROM conjunto_competencia
            WHERE cobertura_ok
            ORDER BY competencia_ano DESC, competencia_mes DESC
            LIMIT 1
        """)
        return cur.fetchone()


def detectar(conn: psycopg.Connection, run_id: int,
             competencia: tuple[int, int] | None = None) -> dict:
    """Roda a detecção para uma competência e grava o resultado da execução."""
    ano, mes = competencia or competencia_mais_recente(conn)

    with conn.cursor() as cur:
        cur.execute(DETECTAR, {
            "run_id": run_id,
            "ano": ano,
            "mes": mes,
            "minimo_pontos": MINIMO_PONTOS,
            "minimo_ativos": MINIMO_ATIVOS,
            "maximo_buracos": MAXIMO_BURACOS,
        })

        cur.execute("""
            SELECT situacao, severidade, count(*)
            FROM anomalias
            WHERE pipeline_run_id = %s AND competencia_ano = %s AND competencia_mes = %s
            GROUP BY 1, 2
        """, (run_id, ano, mes))
        contagem = cur.fetchall()

    conn.commit()
    return {"competencia": (ano, mes), "contagem": contagem}
