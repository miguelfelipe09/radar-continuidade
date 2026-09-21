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
# Queda: caiu a menos de um quarto da mediana do próprio baseline.
RAZAO_QUEDA = 0.25
# Ausência por este número de meses seguidos, com a distribuidora enviando
# normalmente, é código de conjunto aposentado — não mês sem interrupção.
# Um mês de falta é plausível e dois ainda são; três não.
MESES_ENCERRADO = 3
# Acima desta fração do consumidor-hora vinda dos 5 maiores eventos, o
# indicador está apoiado em meia dúzia de registros. Medido em 07/2026: a
# mediana da concentração é 0,43, então 0,5 acenderia em 131 dos 358 alertas
# — mais de um terço da fila, o que é decoração, não sinal. Em 0,7 são 58.
CONCENTRACAO_ALTA = 0.7

DETECTAR = """
INSERT INTO anomalias (
    pipeline_run_id, conjunto_id, competencia_ano, competencia_mes, distribuidora_cnpj,
    situacao, motivo_ausencia, ultimo_registro_ano, ultimo_registro_mes,
    dec_aprox, dec_normalizado, consumidores_afetados,
    consumidores_ativos, eventos, baseline_pontos, buracos_envio, buracos_conjunto,
    baseline_mediana, baseline_q1, baseline_q3, baseline_iqr, limite_alerta,
    desvio_iqr, severidade, reconfiguracao, baseline_esburacado, saturacao_frota,
    concentrado
)
WITH alvo AS (
    SELECT %(ano)s::smallint AS ano, %(mes)s::smallint AS mes
),
-- Índice absoluto de competência (ano*12 + mes-1), para aritmética de janela.
alvo_idx AS (SELECT ano * 12 + mes - 1 AS idx FROM alvo),
comps AS (
    SELECT DISTINCT competencia_ano * 12 + competencia_mes - 1 AS idx
    FROM conjunto_competencia
),
-- Grade distribuidora x competência. É ela que enxerga a ausência total: um
-- mês em que a distribuidora não envia nada não gera linha na agregação, e
-- por isso escapa da regra de cobertura.
dist_mes AS (
    SELECT c.distribuidora_cnpj,
           cc.competencia_ano * 12 + cc.competencia_mes - 1 AS idx,
           count(*) AS n
    FROM conjunto_competencia cc
    JOIN conjuntos c USING (conjunto_id)
    GROUP BY 1, 2
),
dist_perfil AS (
    SELECT distribuidora_cnpj,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY n) AS tipico,
           min(idx) AS ini
    FROM dist_mes GROUP BY 1
),
falha_dist AS (
    SELECT p.distribuidora_cnpj, c.idx
    FROM dist_perfil p
    JOIN comps c ON c.idx >= p.ini
    LEFT JOIN dist_mes dm
           ON dm.distribuidora_cnpj = p.distribuidora_cnpj AND dm.idx = c.idx
    WHERE coalesce(dm.n, 0) < 0.5 * p.tipico
),
-- Tudo que é anterior à competência avaliada. Base do índice e do baseline.
anterior AS (
    SELECT cc.*
    FROM conjunto_competencia cc, alvo a
    WHERE cc.cobertura_ok
      AND cc.cobertura_distribuidora_ok
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
-- Presença do conjunto nas competências anteriores, e a janela dele: a
-- contagem de buracos começa na primeira aparição, senão mês anterior à
-- existência do conjunto viraria falta.
presenca AS (
    SELECT conjunto_id, competencia_ano * 12 + competencia_mes - 1 AS idx
    FROM conjunto_competencia
    WHERE (competencia_ano * 12 + competencia_mes - 1) < (SELECT idx FROM alvo_idx)
),
janela AS (SELECT conjunto_id, min(idx) AS ini FROM presenca GROUP BY 1),
buracos AS (
    SELECT j.conjunto_id,
           count(*) FILTER (WHERE fd.idx IS NOT NULL)::smallint AS buracos_envio,
           count(*) FILTER (WHERE fd.idx IS NULL AND p.idx IS NULL)::smallint AS buracos_conjunto
    FROM janela j
    JOIN conjuntos cj ON cj.conjunto_id = j.conjunto_id
    JOIN comps c ON c.idx >= j.ini AND c.idx < (SELECT idx FROM alvo_idx)
    LEFT JOIN falha_dist fd
           ON fd.distribuidora_cnpj = cj.distribuidora_cnpj AND fd.idx = c.idx
    LEFT JOIN presenca p ON p.conjunto_id = j.conjunto_id AND p.idx = c.idx
    GROUP BY 1
),
-- Conjunto que reportava com regularidade: presente em pelo menos metade das
-- 12 competências anteriores. Conjunto extinto há anos não deve ser cobrado.
esperados AS (
    SELECT conjunto_id FROM presenca
    WHERE idx >= (SELECT idx FROM alvo_idx) - 12
    GROUP BY 1 HAVING count(*) >= 6
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
-- Conjunto esperado que não aparece na competência. O motivo separa problema
-- de fonte (a distribuidora inteira sumiu) de boa notícia (mês sem
-- interrupção num conjunto isolado).
ultimo_registro AS (
    SELECT conjunto_id, max(idx) AS idx FROM presenca GROUP BY 1
),
ausentes AS (
    SELECT e.conjunto_id, cj.distribuidora_cnpj,
           (u.idx / 12)::smallint          AS ultimo_ano,
           (mod(u.idx, 12) + 1)::smallint  AS ultimo_mes,
           CASE
                WHEN fd.idx IS NOT NULL THEN 'distribuidora_ausente'
                -- Ausente há vários meses seguidos enquanto a distribuidora
                -- envia normalmente: o código foi aposentado, não é mês
                -- quieto. Um mês de falta é plausível; três, não.
                WHEN (SELECT idx FROM alvo_idx) - u.idx >= %(meses_encerrado)s
                    THEN 'conjunto_encerrado'
                ELSE 'conjunto_isolado'
           END AS motivo
    FROM esperados e
    JOIN conjuntos cj ON cj.conjunto_id = e.conjunto_id
    JOIN ultimo_registro u ON u.conjunto_id = e.conjunto_id
    LEFT JOIN observado o ON o.conjunto_id = e.conjunto_id
    LEFT JOIN falha_dist fd
           ON fd.distribuidora_cnpj = cj.distribuidora_cnpj
          AND fd.idx = (SELECT idx FROM alvo_idx)
    WHERE o.conjunto_id IS NULL
),
avaliacao AS (
    SELECT
        o.conjunto_id, o.distribuidora_cnpj,
        o.dec_aprox, o.dec_norm, o.consumidores_afetados,
        o.consumidores_ativos, o.eventos,
        b.pontos, b.mediana, b.q1, b.q3, b.q3 - b.q1 AS iqr,
        bu.buracos_envio, bu.buracos_conjunto,
        o.concentracao_top5,
        NULL::smallint AS ultimo_registro_ano,
        NULL::smallint AS ultimo_registro_mes,
        CASE WHEN o.conjunto_id = 0            THEN 'conjunto_invalido'
             WHEN NOT o.cobertura_ok
               OR NOT o.cobertura_distribuidora_ok THEN 'cobertura'
             WHEN o.destoante                  THEN 'destoante'
             WHEN o.dec_aprox IS NULL
               OR o.consumidores_ativos < %(minimo_ativos)s THEN 'denominador'
             WHEN coalesce(b.pontos, 0) < %(minimo_pontos)s THEN 'sem_baseline'
             ELSE 'avaliado'
        END AS situacao,
        NULL::text AS motivo_ausencia,
        EXISTS (
            SELECT 1 FROM conjunto_reconfiguracoes r
            WHERE r.conjunto_id = o.conjunto_id
              AND (r.competencia_ano * 100 + r.competencia_mes)
                  <= (o.competencia_ano * 100 + o.competencia_mes)
        ) AS reconfiguracao
    FROM observado o
    LEFT JOIN baseline b ON b.conjunto_id = o.conjunto_id
    LEFT JOIN buracos  bu ON bu.conjunto_id = o.conjunto_id

    UNION ALL

    SELECT
        au.conjunto_id, au.distribuidora_cnpj,
        NULL, NULL, NULL, NULL, NULL,
        b.pontos, b.mediana, b.q1, b.q3, b.q3 - b.q1,
        bu.buracos_envio, bu.buracos_conjunto,
        NULL::double precision,
        au.ultimo_ano, au.ultimo_mes,
        'ausente', au.motivo,
        EXISTS (
            SELECT 1 FROM conjunto_reconfiguracoes r, alvo a
            WHERE r.conjunto_id = au.conjunto_id
              AND (r.competencia_ano * 100 + r.competencia_mes) <= (a.ano * 100 + a.mes)
        )
    FROM ausentes au
    LEFT JOIN baseline b ON b.conjunto_id = au.conjunto_id
    LEFT JOIN buracos  bu ON bu.conjunto_id = au.conjunto_id
),
classificado AS (
    SELECT *,
        CASE WHEN situacao <> 'avaliado' THEN NULL
             -- Tukey só para cima. Para baixo a cerca é inalcançável: o DEC
             -- não fica negativo e q1 - 1,5*IQR <= 0 em 2.619 dos 2.962.
             WHEN dec_norm > q3 + 3.0 * iqr THEN 'alta'
             WHEN dec_norm > q3 + 1.5 * iqr THEN 'moderada'
             -- Queda por razão: caiu a menos de um quarto do normal. Não é
             -- alerta, é sinal de qualidade — pode ser rede melhorando ou
             -- distribuidora deixando de reportar.
             WHEN dec_norm < %(razao_queda)s * mediana THEN 'queda'
             ELSE 'normal'
        END AS severidade
    FROM avaliacao
)
SELECT
    %(run_id)s,
    conjunto_id,
    (SELECT ano FROM alvo),
    (SELECT mes FROM alvo),
    distribuidora_cnpj,
    situacao,
    motivo_ausencia,
    ultimo_registro_ano,
    ultimo_registro_mes,
    dec_aprox,
    dec_norm,
    consumidores_afetados,
    consumidores_ativos,
    eventos,
    pontos,
    buracos_envio,
    buracos_conjunto,
    mediana,
    q1,
    q3,
    iqr,
    q3 + 1.5 * iqr AS limite_alerta,
    CASE WHEN iqr > 0 THEN (dec_norm - mediana) / iqr END AS desvio_iqr,
    severidade,
    reconfiguracao,
    coalesce(buracos_envio, 0) >= 1 AS baseline_esburacado,
    -- Saturação da frota: quanto da frota avaliada da distribuidora alertou
    -- nesta competência.
    count(*) FILTER (WHERE severidade IN ('alta', 'moderada'))
        OVER (PARTITION BY distribuidora_cnpj)::double precision
    / nullif(count(*) FILTER (WHERE situacao = 'avaliado')
        OVER (PARTITION BY distribuidora_cnpj), 0) AS saturacao_frota,
    concentracao_top5 >= %(concentracao_alta)s AS concentrado
FROM classificado
ON CONFLICT (pipeline_run_id, conjunto_id, competencia_ano, competencia_mes)
DO UPDATE SET
    situacao                = EXCLUDED.situacao,
    motivo_ausencia         = EXCLUDED.motivo_ausencia,
    ultimo_registro_ano     = EXCLUDED.ultimo_registro_ano,
    ultimo_registro_mes     = EXCLUDED.ultimo_registro_mes,
    dec_aprox               = EXCLUDED.dec_aprox,
    dec_normalizado         = EXCLUDED.dec_normalizado,
    consumidores_afetados   = EXCLUDED.consumidores_afetados,
    consumidores_ativos     = EXCLUDED.consumidores_ativos,
    eventos                 = EXCLUDED.eventos,
    baseline_pontos         = EXCLUDED.baseline_pontos,
    buracos_envio           = EXCLUDED.buracos_envio,
    buracos_conjunto        = EXCLUDED.buracos_conjunto,
    saturacao_frota         = EXCLUDED.saturacao_frota,
    concentrado             = EXCLUDED.concentrado,
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


GRAVAR_INDICE = """
INSERT INTO indice_sazonal (pipeline_run_id, competencia_ano, competencia_mes, mes, fator)
WITH anterior AS (
    SELECT cc.dec_aprox, cc.competencia_mes
      FROM conjunto_competencia cc
     WHERE cc.cobertura_ok
       AND cc.cobertura_distribuidora_ok
       AND cc.dec_aprox IS NOT NULL
       AND (cc.competencia_ano * 100 + cc.competencia_mes) < (%(ano)s * 100 + %(mes)s)
)
SELECT %(run_id)s, %(ano)s, %(mes)s, competencia_mes,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY dec_aprox)
         / (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dec_aprox) FROM anterior)
  FROM anterior
 GROUP BY competencia_mes
ON CONFLICT (pipeline_run_id, competencia_ano, competencia_mes, mes)
DO UPDATE SET fator = EXCLUDED.fator
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
            "razao_queda": RAZAO_QUEDA,
            "meses_encerrado": MESES_ENCERRADO,
            "concentracao_alta": CONCENTRACAO_ALTA,
        })

        # O índice sazonal desta avaliação fica gravado: a API precisa dele
        # para desenhar o limiar sobre a série de DEC bruto, e recomputá-lo
        # do outro lado duplicaria a regra.
        cur.execute(GRAVAR_INDICE, {"run_id": run_id, "ano": ano, "mes": mes})

        # Último envio de cada distribuidora, pré-calculado: o boletim lê
        # pronto em vez de varrer a agregação a cada chamada.
        cur.execute("""
            UPDATE distributors d SET
                ultimo_envio_ano = u.ano,
                ultimo_envio_mes = u.mes
            FROM (
                SELECT DISTINCT ON (c.distribuidora_cnpj)
                       c.distribuidora_cnpj,
                       cc.competencia_ano AS ano,
                       cc.competencia_mes AS mes
                FROM conjunto_competencia cc
                JOIN conjuntos c USING (conjunto_id)
                ORDER BY c.distribuidora_cnpj,
                         cc.competencia_ano DESC, cc.competencia_mes DESC
            ) u
            WHERE u.distribuidora_cnpj = d.cnpj
        """)

        # Distribuidora que some tem de aparecer na carga seguinte sem
        # ninguém ir procurar.
        cur.execute("""
            UPDATE pipeline_runs SET distribuidoras_ausentes = (
                SELECT count(DISTINCT distribuidora_cnpj) FROM anomalias
                WHERE pipeline_run_id = %s AND competencia_ano = %s AND competencia_mes = %s
                  AND motivo_ausencia = 'distribuidora_ausente')
            WHERE id = %s
        """, (run_id, ano, mes, run_id))

        cur.execute("""
            SELECT situacao, severidade, count(*)
            FROM anomalias
            WHERE pipeline_run_id = %s AND competencia_ano = %s AND competencia_mes = %s
            GROUP BY 1, 2
        """, (run_id, ano, mes))
        contagem = cur.fetchall()

    conn.commit()
    return {"competencia": (ano, mes), "contagem": contagem}
