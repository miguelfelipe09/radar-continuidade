-- =====================================================================
-- 008 — Buracos de envio, ausência e saturação da frota
--
-- Três ajustes no motor de anomalia, todos vindos da validação sobre as 7
-- competências de 2026.
-- =====================================================================

-- 1) baseline_meses_faltando media a coisa errada: contava como falta os
--    meses anteriores à existência do conjunto, de modo que os 178 conjuntos
--    marcados eram todos conjuntos novos, nenhum com buraco real. Sai, e
--    entram dois contadores com significados distintos.
ALTER TABLE anomalias DROP COLUMN baseline_meses_faltando;

ALTER TABLE anomalias
    -- Meses da janela do conjunto em que a distribuidora dele falhou no
    -- envio (ausente ou abaixo de 50% da frota típica).
    ADD COLUMN buracos_envio smallint,
    -- Meses em que a distribuidora enviou normalmente e só este conjunto não
    -- apareceu — provavelmente mês sem interrupção.
    ADD COLUMN buracos_conjunto smallint,
    -- Preenchido quando situacao = 'ausente'.
    ADD COLUMN motivo_ausencia text,
    -- Percentual da frota avaliada da distribuidora que alertou nesta
    -- competência. Contexto para a apresentação, não muda classificação:
    -- todo mês tem alguma distribuidora entre 14% e 33%, e julho/2026 tem a
    -- LIGHT SESA com 83% — evento sistêmico, não conjunto com problema.
    ADD COLUMN saturacao_frota double precision;

-- 2) A situação ganha 'ausente': conjunto que reportava e não apareceu.
--    Sem isso, os 45 conjuntos da CPFL-PIRATINING somem da fila de 07/2026
--    sem deixar registro.
ALTER TABLE anomalias DROP CONSTRAINT anomalias_situacao_valida;
ALTER TABLE anomalias ADD CONSTRAINT anomalias_situacao_valida CHECK (situacao IN (
    'avaliado', 'ausente', 'conjunto_invalido', 'destoante', 'cobertura',
    'denominador', 'sem_baseline'));

ALTER TABLE anomalias ADD CONSTRAINT anomalias_motivo_ausencia_valido CHECK (
    motivo_ausencia IS NULL
    OR motivo_ausencia IN ('distribuidora_ausente', 'conjunto_isolado'));

-- 3) Distribuidora que some tem de aparecer na carga seguinte sem ninguém ir
--    procurar.
ALTER TABLE pipeline_runs
    ADD COLUMN distribuidoras_ausentes integer NOT NULL DEFAULT 0;
