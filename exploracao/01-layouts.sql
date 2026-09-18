-- =====================================================================
-- 01 — Layouts e volumetria
-- Rodar: duckdb -f exploracao/01-layouts.sql
-- =====================================================================

CREATE OR REPLACE VIEW raw2017 AS
SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2017.parquet');
CREATE OR REPLACE VIEW raw2023 AS
SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2023.parquet');
CREATE OR REPLACE VIEW raw2024 AS
SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2024.parquet');
CREATE OR REPLACE VIEW raw2025 AS
SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS
SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- ---------------------------------------------------------------------
-- Schema de cada ano.
-- 2017–2025: 18 colunas, idênticas entre si.
-- 2026:      26 colunas, estrutura diferente.
-- ---------------------------------------------------------------------
DESCRIBE raw2017;
DESCRIBE raw2023;
DESCRIBE raw2024;
DESCRIBE raw2025;
DESCRIBE raw2026;


-- ---------------------------------------------------------------------
-- Volumetria
-- ---------------------------------------------------------------------
SELECT '2017' AS ano, count(*) AS linhas FROM raw2017
UNION ALL SELECT '2023', count(*) FROM raw2023
UNION ALL SELECT '2024', count(*) FROM raw2024
UNION ALL SELECT '2025', count(*) FROM raw2025
UNION ALL SELECT '2026', count(*) FROM raw2026
ORDER BY ano;


-- ---------------------------------------------------------------------
-- Diferença concreta entre os layouts: quais colunas só existem no novo.
-- ---------------------------------------------------------------------
SELECT column_name AS so_no_layout_novo
FROM (DESCRIBE raw2026)
WHERE column_name NOT IN (SELECT column_name FROM (DESCRIBE raw2025))
ORDER BY 1;

SELECT column_name AS so_no_layout_antigo
FROM (DESCRIBE raw2025)
WHERE column_name NOT IN (SELECT column_name FROM (DESCRIBE raw2026))
ORDER BY 1;


-- ---------------------------------------------------------------------
-- Cobertura temporal de cada arquivo (o de 2026 é parcial).
-- ---------------------------------------------------------------------
SELECT min(DatInicioInterrupcao) AS inicio, max(DatInicioInterrupcao) AS fim,
       count(DISTINCT date_trunc('month', DatInicioInterrupcao)) AS meses
FROM raw2025;

SELECT min(AnoCompetencia * 100 + MesCompetencia) AS competencia_min,
       max(AnoCompetencia * 100 + MesCompetencia) AS competencia_max
FROM raw2026;
