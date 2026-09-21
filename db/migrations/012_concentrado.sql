-- =====================================================================
-- 012 — Sinal de indicador concentrado em poucos eventos
--
-- Marca o conjunto-mês cujo consumidor-hora vem em mais de 70% dos cinco
-- maiores eventos. Nesse caso o alerta está apoiado em meia dúzia de
-- registros, e o analista deve olhar esses registros antes de concluir
-- qualquer coisa sobre a rede.
--
-- O limiar é 0,7 e não 0,5 porque a concentração mediana da fila é 0,43:
-- em 0,5 o sinal acenderia em 131 dos 358 alertas de 07/2026, mais de um
-- terço da fila. Em 0,7 são 58.
-- =====================================================================

ALTER TABLE anomalias
    ADD COLUMN concentrado boolean;
