-- =====================================================================
-- 05 — Comparabilidade das séries e sazonalidade
-- Embasa: ACHADOS.md §3 e §8
--
-- Pergunta mais importante da exploração: os NÚMEROS das duas eras são
-- comparáveis? Se não forem, a série histórica não serve de baseline
-- para detecção de anomalia.
-- =====================================================================

CREATE OR REPLACE VIEW raw2025 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- ---------------------------------------------------------------------
-- Agregação ao grão canônico (conjunto × mês), uma tabela por era.
-- IMPORTANTE: 2026 é agregado SEM filtro de expurgo, para ser
-- comparável com 2025, que não tem essa informação.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE serie_antiga AS
SELECT
    IdeConjuntoUnidadeConsumidora             AS conjunto_id,
    date_trunc('month', DatInicioInterrupcao) AS mes,
    count(*)                                  AS eventos,
    sum(NumUnidadeConsumidora)                AS consumidores_afetados,
    sum(NumUnidadeConsumidora *
        date_diff('minute', DatInicioInterrupcao, DatFimInterrupcao) / 60.0)
                                              AS consumidor_horas,
    mode(NumConsumidorConjunto)               AS consumidores_ativos
FROM raw2025
WHERE DatFimInterrupcao IS NOT NULL
  AND DatFimInterrupcao >= DatInicioInterrupcao
GROUP BY 1, 2;

CREATE OR REPLACE TABLE serie_nova AS
SELECT
    CodConjUnidadeConsumidora                 AS conjunto_id,
    date_trunc('month', DatInicioInterrupcao) AS mes,
    count(*)                                  AS eventos,
    sum(QtdConsumidoresAfetados)              AS consumidores_afetados,
    sum(QtdConsumidoresAfetados *
        date_diff('minute', DatInicioInterrupcao, DatFimInterrupcao) / 60.0)
                                              AS consumidor_horas,
    mode(QtdConsumidoresAtivos)               AS consumidores_ativos
FROM raw2026
WHERE DatFimInterrupcao IS NOT NULL
  AND DatFimInterrupcao >= DatInicioInterrupcao
GROUP BY 1, 2;


-- ---------------------------------------------------------------------
-- Magnitude mês a mês nas duas eras.
-- Lê junto: a curva sazonal (alta no verão, baixa no meio do ano) e os
-- meses de borda com cobertura parcial (poucos conjuntos).
-- ---------------------------------------------------------------------
SELECT 'antiga' AS era, mes,
       count(*)                          AS conjuntos,
       round(median(eventos), 1)         AS mediana_eventos,
       round(median(consumidor_horas / nullif(consumidores_ativos, 0)), 4) AS mediana_dec_aprox
FROM serie_antiga GROUP BY 1, 2
UNION ALL
SELECT 'nova', mes,
       count(*),
       round(median(eventos), 1),
       round(median(consumidor_horas / nullif(consumidores_ativos, 0)), 4)
FROM serie_nova GROUP BY 1, 2
ORDER BY mes;


-- ---------------------------------------------------------------------
-- TESTE DECISIVO: mesmo conjunto, mesmo mês do ano, eras diferentes.
-- Razão perto de 1,0 = as eras são compatíveis.
-- ---------------------------------------------------------------------
WITH a AS (
    SELECT conjunto_id, month(mes) AS m, eventos, consumidor_horas
    FROM serie_antiga WHERE month(mes) <= 7
), b AS (
    SELECT conjunto_id, month(mes) AS m, eventos, consumidor_horas
    FROM serie_nova   WHERE month(mes) <= 7
)
SELECT
    count(*)                                                             AS pares,
    round(median(b.eventos * 1.0 / nullif(a.eventos, 0)), 3)             AS razao_eventos,
    round(median(b.consumidor_horas / nullif(a.consumidor_horas, 0)), 3) AS razao_cons_horas
FROM a JOIN b USING (conjunto_id, m);


-- ---------------------------------------------------------------------
-- Sanidade do DEC aproximado.
-- Esperado: 0,5–2 h/consumidor/mês (≈ 10–15 h/ano no Brasil).
-- Valor absurdo aqui = fórmula ou denominador errado.
-- ---------------------------------------------------------------------
WITH dec AS (
    SELECT consumidor_horas / nullif(consumidores_ativos, 0) AS dec_mes
    FROM serie_nova WHERE consumidores_ativos > 0
)
SELECT
    round(quantile_cont(dec_mes, 0.50), 3) AS p50,
    round(quantile_cont(dec_mes, 0.90), 3) AS p90,
    round(quantile_cont(dec_mes, 0.99), 3) AS p99,
    round(max(dec_mes), 2)                 AS maximo
FROM dec;


-- ---------------------------------------------------------------------
-- Meses de borda: cobertura parcial que precisa ficar fora do baseline.
-- Compara a contagem de conjuntos de cada mês com a mediana geral.
-- ---------------------------------------------------------------------
WITH cobertura AS (
    SELECT mes, count(*) AS conjuntos FROM serie_nova GROUP BY 1
    UNION ALL
    SELECT mes, count(*) FROM serie_antiga GROUP BY 1
)
SELECT mes, conjuntos,
       round(100.0 * conjuntos / max(conjuntos) OVER (), 1) AS pct_da_cobertura_maxima
FROM cobertura
ORDER BY mes;
