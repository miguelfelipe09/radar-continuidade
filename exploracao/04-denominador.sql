-- =====================================================================
-- 04 — Denominador do indicador (consumidores ativos)
-- Embasa: ACHADOS.md §4
--
-- Pergunta: NumUnidadeConsumidora / NumConsumidorConjunto são mesmo
-- "afetados" e "ativos"? O denominador é estável o bastante para
-- normalizar o indicador?
-- =====================================================================

CREATE OR REPLACE VIEW raw2025 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- ---------------------------------------------------------------------
-- Hipótese: no layout antigo, NumUnidadeConsumidora = afetados e
-- NumConsumidorConjunto = ativos no conjunto.
-- Se a hipótese vale, afetados nunca deveria exceder ativos.
-- ---------------------------------------------------------------------
SELECT
    count(*) FILTER (WHERE NumUnidadeConsumidora > NumConsumidorConjunto) AS viola,
    count(*)                                                              AS total,
    max(NumUnidadeConsumidora)                                            AS max_afetados,
    max(NumConsumidorConjunto)                                            AS max_ativos
FROM raw2025;

-- Mesmo teste no layout novo, onde os nomes são explícitos.
SELECT
    count(*) FILTER (WHERE QtdConsumidoresAfetados > QtdConsumidoresAtivos) AS viola,
    count(*)                                                                AS total
FROM raw2026;


-- ---------------------------------------------------------------------
-- Estabilidade dentro de conjunto-MÊS.
-- Agrupar por ano inteiro superestima a inconsistência, porque a base
-- de consumidores cresce ao longo de 12 meses.
-- ---------------------------------------------------------------------
SELECT count(*) FILTER (WHERE n > 1) AS inconsistentes, count(*) AS grupos
FROM (
    SELECT IdeConjuntoUnidadeConsumidora,
           date_trunc('month', DatInicioInterrupcao) AS mes,
           count(DISTINCT NumConsumidorConjunto)     AS n
    FROM raw2025 GROUP BY 1, 2
);


-- ---------------------------------------------------------------------
-- Amplitude da variação ao longo do ano.
-- Mediana próxima de 1,0 = crescimento normal da base.
-- Valores extremos = dado sujo, precisa de corte.
-- ---------------------------------------------------------------------
WITH razoes AS (
    SELECT max(NumConsumidorConjunto) * 1.0 / nullif(min(NumConsumidorConjunto), 0) AS razao
    FROM raw2025
    WHERE NumConsumidorConjunto > 0
    GROUP BY IdeConjuntoUnidadeConsumidora
)
SELECT
    round(quantile_cont(razao, 0.50), 4) AS p50,
    round(quantile_cont(razao, 0.95), 4) AS p95,
    round(quantile_cont(razao, 0.99), 4) AS p99,
    round(max(razao), 2)                 AS maximo,
    count(*) FILTER (WHERE razao > 3)    AS acima_do_corte_3x,
    count(*)                             AS conjuntos
FROM razoes;

-- Quem são os conjuntos fora do corte (para confirmar que é dado sujo
-- e não um conjunto legítimo em expansão acelerada).
WITH razoes AS (
    SELECT IdeConjuntoUnidadeConsumidora AS conjunto,
           min(NumConsumidorConjunto) AS minimo,
           max(NumConsumidorConjunto) AS maximo,
           max(NumConsumidorConjunto) * 1.0 / nullif(min(NumConsumidorConjunto), 0) AS razao
    FROM raw2025 WHERE NumConsumidorConjunto > 0
    GROUP BY 1
)
SELECT * FROM razoes WHERE razao > 3 ORDER BY razao DESC LIMIT 20;


-- ---------------------------------------------------------------------
-- Regra adotada: moda de consumidores ativos por conjunto-mês.
-- Prévia do resultado.
-- ---------------------------------------------------------------------
SELECT IdeConjuntoUnidadeConsumidora            AS conjunto,
       date_trunc('month', DatInicioInterrupcao) AS mes,
       mode(NumConsumidorConjunto)               AS ativos_moda,
       min(NumConsumidorConjunto)                AS ativos_min,
       max(NumConsumidorConjunto)                AS ativos_max
FROM raw2025
GROUP BY 1, 2
ORDER BY 1, 2
LIMIT 20;

-- ---------------------------------------------------------------------
-- Regra adotada (revisada): o corte é por conjunto-MÊS contra a mediana
-- anual do próprio conjunto, não por conjunto inteiro.
-- Motivo: um conjunto com 11 meses bons e 1 quebrado deve perder só o
-- mês ruim — descartar o ano inteiro custa baseline.
-- ---------------------------------------------------------------------
WITH por_mes AS (
    SELECT IdeConjuntoUnidadeConsumidora            AS conjunto,
           date_trunc('month', DatInicioInterrupcao) AS mes,
           mode(NumConsumidorConjunto)               AS ativos
    FROM raw2025 WHERE NumConsumidorConjunto > 0
    GROUP BY 1, 2
),
com_mediana AS (
    SELECT *, median(ativos) OVER (PARTITION BY conjunto) AS mediana_conjunto
    FROM por_mes
)
SELECT
    count(*)                                          AS conjunto_mes_total,
    count(*) FILTER (WHERE ativos > mediana_conjunto * 3
                        OR ativos < mediana_conjunto / 3) AS descartados,
    count(DISTINCT conjunto) FILTER (WHERE ativos > mediana_conjunto * 3
                                        OR ativos < mediana_conjunto / 3) AS conjuntos_afetados
FROM com_mediana;

-- Quais conjunto-mês caem fora (esperado: poucos, concentrados nos 5
-- conjuntos que apareceram com razão anual alta).
WITH por_mes AS (
    SELECT IdeConjuntoUnidadeConsumidora            AS conjunto,
           date_trunc('month', DatInicioInterrupcao) AS mes,
           mode(NumConsumidorConjunto)               AS ativos
    FROM raw2025 WHERE NumConsumidorConjunto > 0
    GROUP BY 1, 2
),
com_mediana AS (
    SELECT *, median(ativos) OVER (PARTITION BY conjunto) AS mediana_conjunto
    FROM por_mes
)
SELECT conjunto, mes, ativos, mediana_conjunto,
       round(ativos / nullif(mediana_conjunto, 0), 2) AS razao
FROM com_mediana
WHERE ativos > mediana_conjunto * 3 OR ativos < mediana_conjunto / 3
ORDER BY conjunto, mes;