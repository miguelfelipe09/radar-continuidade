-- =====================================================================
-- 06 — Expurgo e taxonomia de causa
-- Embasa: ACHADOS.md §6 e §7
-- =====================================================================

CREATE OR REPLACE VIEW raw2025 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- ---------------------------------------------------------------------
-- Distribuição dos motivos de expurgo (2026).
-- ATENÇÃO: o campo NUNCA é nulo. Quando não há expurgo, vem o texto
-- "Não houve Expurgo". Filtrar por IS NULL zera o indicador inteiro.
-- ---------------------------------------------------------------------
SELECT DscMotivoExpurgo,
       count(*)                                           AS n,
       round(100.0 * count(*) / sum(count(*)) OVER (), 2) AS pct
FROM raw2026
GROUP BY 1 ORDER BY 2 DESC;

-- Quantos nulos de fato existem (esperado: zero).
SELECT count(*) FILTER (WHERE DscMotivoExpurgo IS NULL) AS nulos,
       count(*)                                         AS total
FROM raw2026;

-- Total expurgado, com o filtro correto.
SELECT
    count(*) FILTER (WHERE DscMotivoExpurgo <> 'Não houve Expurgo') AS expurgados,
    count(*)                                                        AS total,
    round(100.0 * count(*) FILTER (WHERE DscMotivoExpurgo <> 'Não houve Expurgo')
          / count(*), 2)                                            AS pct
FROM raw2026;

-- Impacto no indicador: o expurgo está concentrado em poucos conjuntos
-- (região de temporal) ou espalhado (rede ruim)?
WITH por_conjunto AS (
    SELECT CodConjUnidadeConsumidora AS conjunto,
           count(*)                                                        AS total,
           count(*) FILTER (WHERE DscMotivoExpurgo <> 'Não houve Expurgo')  AS expurgados
    FROM raw2026 GROUP BY 1
)
SELECT
    round(quantile_cont(expurgados * 1.0 / nullif(total, 0), 0.50), 3) AS p50_taxa_expurgo,
    round(quantile_cont(expurgados * 1.0 / nullif(total, 0), 0.90), 3) AS p90,
    round(quantile_cont(expurgados * 1.0 / nullif(total, 0), 0.99), 3) AS p99
FROM por_conjunto;


-- ---------------------------------------------------------------------
-- Layout antigo: existe algo equivalente a expurgo?
-- Resposta: não. DscTipoInterrupcao só separa programada de não
-- programada, e IdeMotivoInterrupcao não mapeia nas categorias de 2026.
-- ---------------------------------------------------------------------
SELECT DscTipoInterrupcao, count(*) AS n
FROM raw2025 GROUP BY 1 ORDER BY 2 DESC;

SELECT IdeMotivoInterrupcao, count(*) AS n
FROM raw2025 GROUP BY 1 ORDER BY 2 DESC;


-- ---------------------------------------------------------------------
-- Taxonomia de causa: 4 campos normalizados no layout novo...
-- ---------------------------------------------------------------------
SELECT
    count(DISTINCT DscFatoGeradorOrigem)  AS origens,
    count(DISTINCT DscFatoGeradorTipo)    AS tipos,
    count(DISTINCT DscFatoGeradorCausa)   AS causas,
    count(DISTINCT DscFatoGeradorDetalhe) AS detalhes
FROM raw2026;

-- ...contra um único campo de texto livre no layout antigo.
SELECT count(DISTINCT DscFatoGeradorInterrupcao) AS cardinalidade FROM raw2025;

-- A bagunça: mesma hierarquia, escrita de N formas diferentes por
-- distribuidora (separador ; ou -, com/sem acento, caixa variada,
-- e pelo menos um erro de grafia: "INTERNO" em vez de "INTERNA").
SELECT DscFatoGeradorInterrupcao, count(*) AS n
FROM raw2025 GROUP BY 1 ORDER BY 2 DESC LIMIT 25;

-- Estimativa do ganho de uma normalização (não implementada no MVP):
-- padronizando caixa, acento e separador, quanto a cardinalidade cai?
SELECT count(DISTINCT
    regexp_replace(
        upper(strip_accents(DscFatoGeradorInterrupcao)),
        '\s*[;\-]\s*', '|', 'g')
) AS cardinalidade_normalizada
FROM raw2025;
