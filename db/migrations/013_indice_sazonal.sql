-- =====================================================================
-- 013 — Índice sazonal usado em cada avaliação
--
-- O baseline vive na escala dessazonalizada: `limite_alerta` só faz sentido
-- comparado com `dec_normalizado`. Para desenhar o limiar sobre a série de
-- DEC bruto — que é o número que o analista reconhece — é preciso o fator
-- de cada mês.
--
-- O fator é gravado, e não recalculado na API, porque ele é resultado da
-- detecção: recomputá-lo do outro lado criaria duas implementações da mesma
-- regra, livres para divergir em silêncio.
--
-- Uma linha por mês do calendário, por competência avaliada, por execução:
-- o índice é apurado só com competências anteriores à avaliada, então muda
-- a cada avaliação.
-- =====================================================================

CREATE TABLE indice_sazonal (
    pipeline_run_id  bigint   NOT NULL REFERENCES pipeline_runs (id) ON DELETE CASCADE,
    competencia_ano  smallint NOT NULL,
    competencia_mes  smallint NOT NULL,
    mes              smallint NOT NULL,
    fator            double precision NOT NULL,

    PRIMARY KEY (pipeline_run_id, competencia_ano, competencia_mes, mes),
    CONSTRAINT indice_sazonal_mes_valido CHECK (mes BETWEEN 1 AND 12)
);

COMMENT ON TABLE indice_sazonal IS
    'Índice sazonal (mediana do mês ÷ mediana geral) apurado sobre as '
    'competências anteriores à avaliada, como usado pela detecção.';
