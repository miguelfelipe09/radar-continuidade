-- =====================================================================
-- 009 — Último envio da distribuidora
--
-- O boletim precisa dizer desde quando a distribuidora ausente parou de
-- enviar. Calcular isso a cada chamada seria varrer conjunto_competencia
-- por uma informação que muda uma vez por carga, então fica pré-calculado
-- na detecção: são 52 linhas.
-- =====================================================================

ALTER TABLE distributors
    ADD COLUMN ultimo_envio_ano smallint,
    ADD COLUMN ultimo_envio_mes smallint;
