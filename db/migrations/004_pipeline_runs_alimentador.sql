-- =====================================================================
-- 004 — Contador de alimentador nulo em pipeline_runs
--
-- A regra de converter alimentador nulo em string vazia entrou no schema
-- (migration 002), mas sem contador: o número ficava invisível na execução.
-- São 58 linhas em 2024 e 821 em 2025 (ACHADOS §13) — poucas, mas são
-- exatamente as que passariam sem validação de unicidade se a conversão
-- deixasse de acontecer.
-- =====================================================================

ALTER TABLE pipeline_runs
    ADD COLUMN linhas_alimentador_nulo integer NOT NULL DEFAULT 0;
