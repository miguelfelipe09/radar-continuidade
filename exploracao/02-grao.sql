-- =====================================================================
-- 02 — Grão de análise: alimentador ou conjunto elétrico?
-- Pergunta: qual entidade sobrevive à mudança de layout e pode servir
-- de base para uma série histórica?
-- =====================================================================

CREATE OR REPLACE VIEW raw2025 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- ---------------------------------------------------------------------
-- Pré-requisito: o CNPJ da distribuidora é o mesmo número nos dois
-- layouts? Se não for, nenhuma intersecção abaixo faz sentido.
-- ---------------------------------------------------------------------
SELECT
    (SELECT count(DISTINCT NumCPFCNPJ) FROM raw2025)           AS cnpj_2025,
    (SELECT count(DISTINCT NumCNPJDistribuidora) FROM raw2026) AS cnpj_2026,
    (SELECT count(*) FROM (
        SELECT DISTINCT NumCPFCNPJ FROM raw2025
        INTERSECT
        SELECT DISTINCT NumCNPJDistribuidora FROM raw2026))    AS em_ambos;


-- ---------------------------------------------------------------------
-- Alimentador: os códigos são compatíveis entre as eras?
-- ---------------------------------------------------------------------
SELECT
    (SELECT count(*) FROM (SELECT DISTINCT NumCPFCNPJ, DscAlimentadorSubestacao FROM raw2025))     AS alim_2025,
    (SELECT count(*) FROM (SELECT DISTINCT NumCNPJDistribuidora, CodAlimentador FROM raw2026))     AS alim_2026,
    (SELECT count(*) FROM (
        SELECT DISTINCT NumCPFCNPJ, DscAlimentadorSubestacao FROM raw2025
        INTERSECT
        SELECT DISTINCT NumCNPJDistribuidora, CodAlimentador FROM raw2026))                        AS em_ambos;

-- Amostra dos formatos — mostra que são esquemas de codificação distintos.
-- 2025: códigos curtos locais à subestação (01C4, KCC11, BEB08)
-- 2026: códigos numéricos longos (848000216, 814160016)
SELECT DISTINCT DscAlimentadorSubestacao FROM raw2025 LIMIT 15;
SELECT DISTINCT CodAlimentador          FROM raw2026 LIMIT 15;

-- Confirmação de que o código curto não é único fora da distribuidora:
-- se cod_sozinho << par, o código só faz sentido junto do CNPJ.
SELECT
    count(DISTINCT DscAlimentadorSubestacao)                      AS cod_sozinho,
    count(DISTINCT (NumCPFCNPJ, DscAlimentadorSubestacao))        AS par_com_cnpj
FROM raw2025;


-- ---------------------------------------------------------------------
-- Conjunto elétrico: identificador numérico, presente nos dois layouts.
-- Este é o teste que decidiu o grão do projeto.
-- ---------------------------------------------------------------------
SELECT
    (SELECT count(DISTINCT IdeConjuntoUnidadeConsumidora) FROM raw2025) AS conj_2025,
    (SELECT count(DISTINCT CodConjUnidadeConsumidora) FROM raw2026)     AS conj_2026,
    (SELECT count(*) FROM (
        SELECT DISTINCT IdeConjuntoUnidadeConsumidora FROM raw2025
        INTERSECT
        SELECT DISTINCT CodConjUnidadeConsumidora FROM raw2026))        AS em_ambos;

-- Conjuntos que existem numa era e não na outra (revisões tarifárias e
-- conjuntos sem ocorrência no ano parcial de 2026).
SELECT count(*) AS so_em_2025 FROM (
    SELECT DISTINCT IdeConjuntoUnidadeConsumidora FROM raw2025
    EXCEPT
    SELECT DISTINCT CodConjUnidadeConsumidora FROM raw2026);

SELECT count(*) AS so_em_2026 FROM (
    SELECT DISTINCT CodConjUnidadeConsumidora FROM raw2026
    EXCEPT
    SELECT DISTINCT IdeConjuntoUnidadeConsumidora FROM raw2025);
