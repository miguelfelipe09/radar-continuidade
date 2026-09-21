-- =====================================================================
-- 011 — Concentração do consumidor-hora
--
-- Quanto do consumidor-hora do conjunto-mês vem dos 5 maiores eventos.
-- Alta concentração significa que o indicador está apoiado em meia dúzia de
-- registros, e o analista deve olhar esses registros antes de concluir
-- qualquer coisa sobre a rede.
--
-- Veio de uma investigação que refutou a hipótese anterior: o Jaboticabal 2
-- e o Ribeirão Preto 4, os dois maiores desvios de 07/2026, não têm
-- interrupções longas sustentando o número — têm um mês inteiro de eventos
-- mais longos e mais abrangentes (ACHADOS §14). O corte por duração não
-- pegava nada; a concentração é a medida que responde à pergunta certa.
-- =====================================================================

ALTER TABLE conjunto_competencia
    ADD COLUMN concentracao_top5 double precision;

COMMENT ON COLUMN conjunto_competencia.concentracao_top5 IS
    'Fração do consumidor-hora vinda dos 5 eventos de maior impacto. Nulo '
    'quando não há eventos.';
