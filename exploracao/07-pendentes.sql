-- =====================================================================
-- 07 — Itens em aberto
-- Embasa: ACHADOS.md, seção "Em aberto"
--
-- Rodar quando sobrar tempo e atualizar o ACHADOS.md com os resultados.
-- =====================================================================

CREATE OR REPLACE VIEW raw2024 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2024.parquet');
CREATE OR REPLACE VIEW raw2025 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- ---------------------------------------------------------------------
-- 1. Duração no layout NOVO.
-- As estatísticas que temos no ACHADOS.md são do arquivo de 2017 e não
-- valem para 2026. Isto substitui aquele número.
-- Decide: a regra de descarte do ETL.
-- ---------------------------------------------------------------------
WITH d AS (
    SELECT date_diff('minute', DatInicioInterrupcao, DatFimInterrupcao) AS min_dur
    FROM raw2026 WHERE DatFimInterrupcao IS NOT NULL
)
SELECT
    count(*) FILTER (WHERE min_dur < 0)     AS negativa,
    count(*) FILTER (WHERE min_dur = 0)     AS zero,
    count(*) FILTER (WHERE min_dur > 1440)  AS acima_24h,
    count(*) FILTER (WHERE min_dur > 10080) AS acima_7dias,
    round(median(min_dur), 1)               AS mediana_min,
    round(quantile_cont(min_dur, 0.95), 1)  AS p95_min,
    max(min_dur)                            AS max_min,
    count(*)                                AS total
FROM d;

SELECT count(*) AS sem_data_fim FROM raw2026 WHERE DatFimInterrupcao IS NULL;

-- Mesma coisa para 2025, já que a série usa as duas eras.
WITH d AS (
    SELECT date_diff('minute', DatInicioInterrupcao, DatFimInterrupcao) AS min_dur
    FROM raw2025 WHERE DatFimInterrupcao IS NOT NULL
)
SELECT
    count(*) FILTER (WHERE min_dur < 0)     AS negativa,
    count(*) FILTER (WHERE min_dur > 1440)  AS acima_24h,
    round(median(min_dur), 1)               AS mediana_min,
    max(min_dur)                            AS max_min
FROM d;


-- ---------------------------------------------------------------------
-- 2. Código IBGE do município (só existe no layout novo).
-- Esperado: 7 dígitos, 27 UFs nos 2 primeiros dígitos.
-- Decide: se dá para derivar UF sem tabela externa.
-- ---------------------------------------------------------------------
SELECT
    count(DISTINCT CodMunicipioIBGE)                                       AS municipios,
    count(DISTINCT substr(CAST(CodMunicipioIBGE AS VARCHAR), 1, 2))        AS ufs,
    count(*) FILTER (WHERE length(CAST(CodMunicipioIBGE AS VARCHAR)) <> 7) AS codigo_malformado,
    count(*) FILTER (WHERE CodMunicipioIBGE IS NULL)                       AS nulos
FROM raw2026;

-- Distribuição por UF (sanidade: SP, MG, RS no topo).
SELECT substr(CAST(CodMunicipioIBGE AS VARCHAR), 1, 2) AS uf_ibge, count(*) AS n
FROM raw2026 GROUP BY 1 ORDER BY 2 DESC;


-- ---------------------------------------------------------------------
-- 3. 2024 — assumido idêntico a 2025 pelo DESCRIBE, mas nunca medido.
-- Decide: se entra no recorte sem ressalva.
-- ---------------------------------------------------------------------
SELECT
    count(*)                                          AS linhas,
    count(DISTINCT IdeConjuntoUnidadeConsumidora)     AS conjuntos,
    count(DISTINCT NumCPFCNPJ)                        AS distribuidoras,
    count(DISTINCT date_trunc('month', DatInicioInterrupcao)) AS meses,
    min(DatInicioInterrupcao)                         AS inicio,
    max(DatInicioInterrupcao)                         AS fim
FROM raw2024;

-- Continuidade dos conjuntos 2024 → 2025 → 2026.
SELECT
    (SELECT count(*) FROM (
        SELECT DISTINCT IdeConjuntoUnidadeConsumidora FROM raw2024
        INTERSECT
        SELECT DISTINCT IdeConjuntoUnidadeConsumidora FROM raw2025)) AS conj_2024_2025,
    (SELECT count(*) FROM (
        SELECT DISTINCT IdeConjuntoUnidadeConsumidora FROM raw2024
        INTERSECT
        SELECT DISTINCT CodConjUnidadeConsumidora FROM raw2026))     AS conj_2024_2026;

SELECT length(CAST(CodMunicipioIBGE AS VARCHAR)) AS digitos, count(*) AS n,
       min(CodMunicipioIBGE) AS exemplo_min, max(CodMunicipioIBGE) AS exemplo_max
FROM raw2026 GROUP BY 1 ORDER BY 1;

SELECT SigAgente, count(*) AS n
FROM raw2026
WHERE length(CAST(CodMunicipioIBGE AS VARCHAR)) <> 7
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;

SELECT count(DISTINCT substr(CAST(CodMunicipioIBGE AS VARCHAR), 1, 2)) AS ufs,
       count(DISTINCT CodMunicipioIBGE) AS municipios
FROM raw2026
WHERE length(CAST(CodMunicipioIBGE AS VARCHAR)) = 7;