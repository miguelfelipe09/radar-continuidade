-- =====================================================================
-- 010 — Conjunto encerrado
--
-- A situação 'ausente' dizia "sem interrupções nesta competência" para
-- códigos de conjunto **aposentados**. Os 85 casos de conjunto_isolado em
-- 07/2026 são todos das seis distribuidoras que renumeraram a frota
-- (ACHADOS §14), e todos estão ausentes há exatamente 7 meses — desde
-- dez/2025. Dizer que não houve interrupção neles é o oposto da verdade.
--
-- Passa a haver um terceiro motivo, e a competência do último registro,
-- para a mensagem dizer desde quando.
-- =====================================================================

ALTER TABLE anomalias DROP CONSTRAINT anomalias_motivo_ausencia_valido;
ALTER TABLE anomalias ADD CONSTRAINT anomalias_motivo_ausencia_valido CHECK (
    motivo_ausencia IS NULL
    OR motivo_ausencia IN (
        'distribuidora_ausente',  -- a distribuidora inteira parou de enviar
        'conjunto_encerrado',     -- código aposentado: ausente há 3 meses ou mais
        'conjunto_isolado'        -- faltou neste mês, estava presente antes
    ));

ALTER TABLE anomalias
    ADD COLUMN ultimo_registro_ano smallint,
    ADD COLUMN ultimo_registro_mes smallint;
