-- =====================================================================
-- 007 — Cobertura por distribuidora
--
-- A regra dos 50% de cobertura (ACHADOS §8) é global e não enxerga uma
-- distribuidora inteira falhando: a LIGHT SESA não enviou fevereiro/2026
-- (109 conjuntos ausentes), e isso é 3,5% do total — invisível para o corte
-- global.
--
-- A mesma regra no grão da distribuidora: competência em que ela aparece com
-- menos de 50% dos conjuntos que reporta tipicamente fica fora do baseline
-- dela, e não do de todo mundo.
-- =====================================================================

ALTER TABLE conjunto_competencia
    ADD COLUMN cobertura_distribuidora_ok boolean NOT NULL DEFAULT true;
