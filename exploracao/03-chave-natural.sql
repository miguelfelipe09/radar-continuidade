-- =====================================================================
-- 03 — Chave natural e deduplicação
-- Embasa: ACHADOS.md §5
--
-- Pergunta: qual combinação de colunas identifica unicamente um
-- registro em cada era? É o ON CONFLICT do upsert.
-- =====================================================================

CREATE OR REPLACE VIEW raw2025 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2025.parquet');
CREATE OR REPLACE VIEW raw2026 AS SELECT * FROM read_parquet('data/interrupcoes-energia-eletrica-2026.parquet');


-- =====================================================================
-- LAYOUT NOVO (2026)
-- =====================================================================

-- Qual combinação fecha? (comparar cada contagem com "linhas")
SELECT
    count(*)                                                                      AS linhas,
    count(DISTINCT (NumCNPJDistribuidora, CodInterrupcao))                        AS por_interrupcao,
    count(DISTINCT (NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao))  AS com_data,
    count(DISTINCT (NumCNPJDistribuidora, CodInterrupcao, CodAlimentador,
                    DatInicioInterrupcao))                                        AS com_alimentador,
    count(DISTINCT (NumCNPJDistribuidora, CodEvento, CodOcorrencia,
                    CodInterrupcao))                                              AS com_evento
FROM raw2026;

-- Onde as duplicatas estão concentradas.
SELECT SigAgente, count(*) AS linhas_envolvidas
FROM raw2026
WHERE (NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao) IN (
    SELECT NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao
    FROM raw2026 GROUP BY 1,2,3 HAVING count(*) > 1)
GROUP BY 1 ORDER BY 2 DESC;

-- O que difere entre as linhas do mesmo grupo.
-- Resultado: só os segundos de DatFimInterrupcao (ex. 07:01:16 vs 07:01:00).
SELECT NumCNPJDistribuidora, CodInterrupcao, CodConjUnidadeConsumidora,
       CodAlimentador, DatInicioInterrupcao, DatFimInterrupcao,
       DscFatoGeradorCausa, DscMotivoExpurgo, QtdConsumidoresAfetados
FROM raw2026
WHERE (NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao) IN (
    SELECT NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao
    FROM raw2026 GROUP BY 1,2,3 HAVING count(*) > 1 LIMIT 5)
ORDER BY 1, 2, 5;

-- Confirmação de que a diferença é sempre de precisão:
-- em cada par duplicado, uma linha tem segundos e a outra não.
WITH dups AS (
    SELECT *, count(*) OVER (
        PARTITION BY NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao) AS n
    FROM raw2026
)
SELECT
    count(*) FILTER (WHERE second(DatFimInterrupcao) = 0)  AS fim_truncado_no_minuto,
    count(*) FILTER (WHERE second(DatFimInterrupcao) <> 0) AS fim_com_segundos,
    count(*)                                               AS total_em_grupos_duplicados
FROM dups WHERE n > 1;

-- Regra de deduplicação adotada: manter a linha de maior precisão.
-- (prévia — quantas linhas sobrariam)
WITH ranked AS (
    SELECT *, row_number() OVER (
        PARTITION BY NumCNPJDistribuidora, CodInterrupcao, DatInicioInterrupcao
        ORDER BY CASE WHEN second(DatFimInterrupcao) <> 0 THEN 0 ELSE 1 END,
                 DatFimInterrupcao DESC) AS rn
    FROM raw2026
)
SELECT count(*) FILTER (WHERE rn = 1) AS apos_dedup,
       count(*) FILTER (WHERE rn > 1) AS descartadas
FROM ranked;


-- =====================================================================
-- LAYOUT ANTIGO (2025)
-- =====================================================================

-- Nenhuma combinação fecha — nem incluindo o alimentador.
SELECT
    count(*)                                                                AS linhas,
    count(DISTINCT (NumCPFCNPJ, NumOrdemInterrupcao))                       AS por_ordem,
    count(DISTINCT (NumCPFCNPJ, NumOrdemInterrupcao,
                    DatInicioInterrupcao))                                  AS com_data,
    count(DISTINCT (NumCPFCNPJ, NumOrdemInterrupcao, DatInicioInterrupcao,
                    IdeConjuntoUnidadeConsumidora))                         AS com_conjunto,
    count(DISTINCT (NumCPFCNPJ, NumOrdemInterrupcao, DatInicioInterrupcao,
                    IdeConjuntoUnidadeConsumidora,
                    DscAlimentadorSubestacao))                              AS com_alimentador
FROM raw2025;

-- Por quê: não são duplicatas, são ETAPAS DE RESTABELECIMENTO.
-- Mesma ordem, mesmo alimentador, mesmo início, fins e afetados diferentes.
SELECT NumCPFCNPJ, NumOrdemInterrupcao, IdeConjuntoUnidadeConsumidora,
       DscAlimentadorSubestacao, DatInicioInterrupcao, DatFimInterrupcao,
       NumUnidadeConsumidora, NumConsumidorConjunto
FROM raw2025
WHERE (NumCPFCNPJ, NumOrdemInterrupcao, DatInicioInterrupcao) IN (
    SELECT NumCPFCNPJ, NumOrdemInterrupcao, DatInicioInterrupcao
    FROM raw2025 GROUP BY 1,2,3 HAVING count(*) > 1 LIMIT 4)
ORDER BY 1, 2, 6;

-- Quantas etapas por ocorrência, tipicamente.
WITH etapas AS (
    SELECT NumCPFCNPJ, NumOrdemInterrupcao, DatInicioInterrupcao,
           IdeConjuntoUnidadeConsumidora, DscAlimentadorSubestacao,
           count(*) AS n
    FROM raw2025 GROUP BY 1,2,3,4,5
)
SELECT
    count(*)                       AS ocorrencias,
    count(*) FILTER (WHERE n = 1)  AS etapa_unica,
    round(avg(n), 2)               AS media_etapas,
    max(n)                         AS max_etapas
FROM etapas;

-- Chave adotada: sequência estável por ordenação determinística.
-- Se distintas = linhas, a chave é única e idempotente.
WITH seq AS (
    SELECT row_number() OVER (
        PARTITION BY NumCPFCNPJ, NumOrdemInterrupcao,
                     IdeConjuntoUnidadeConsumidora, DscAlimentadorSubestacao,
                     DatInicioInterrupcao
        ORDER BY DatFimInterrupcao, NumUnidadeConsumidora) AS seq,
        NumCPFCNPJ, NumOrdemInterrupcao, IdeConjuntoUnidadeConsumidora,
        DscAlimentadorSubestacao, DatInicioInterrupcao
    FROM raw2025
)
SELECT count(*) AS linhas,
       count(DISTINCT (NumCPFCNPJ, NumOrdemInterrupcao,
                       IdeConjuntoUnidadeConsumidora, DscAlimentadorSubestacao,
                       DatInicioInterrupcao, seq)) AS distintas
FROM seq;
