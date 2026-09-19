-- =====================================================================
-- 006 — Fila de investigação (detecção de anomalia)
--
-- Uma linha por conjunto considerado numa competência, versionada pela
-- execução do pipeline que a produziu: alerta é afirmação datada, e a
-- próxima carga pode mudá-la quando a ANEEL retificar o dado.
--
-- Guarda também os conjuntos NÃO avaliados, com o motivo. Sem isso, "3.075
-- conjuntos, 2.950 avaliados" vira número sem explicação.
-- =====================================================================

CREATE TABLE anomalias (
    pipeline_run_id     bigint   NOT NULL REFERENCES pipeline_runs (id) ON DELETE CASCADE,
    conjunto_id         bigint   NOT NULL REFERENCES conjuntos (conjunto_id),
    competencia_ano     smallint NOT NULL,
    competencia_mes     smallint NOT NULL,
    distribuidora_cnpj  bigint   NOT NULL,

    -- avaliado | conjunto_invalido | destoante | cobertura | denominador | sem_baseline
    situacao  text NOT NULL,

    -- observado na competência
    dec_aprox              double precision,
    dec_normalizado        double precision,  -- dividido pelo índice sazonal do mês
    consumidores_afetados  bigint,
    consumidores_ativos    integer,
    eventos                integer,

    -- baseline: história do próprio conjunto, dessazonalizada
    baseline_pontos          smallint,
    baseline_meses_faltando  smallint,
    baseline_mediana         double precision,
    baseline_q1              double precision,
    baseline_q3              double precision,
    baseline_iqr             double precision,
    limite_alerta            double precision,  -- q3 + 1,5 * IQR
    desvio_iqr               double precision,  -- (observado - mediana) / IQR

    -- alta | moderada | normal | queda
    --
    -- "queda" não é alerta: é sinal de qualidade. Conjunto que despenca pode
    -- ser rede melhorando ou distribuidora deixando de reportar, e a segunda
    -- hipótese interessa ao analista. Fica fora da fila.
    severidade  text,

    -- Mudança administrativa não é anomalia operacional: vira nota.
    reconfiguracao  boolean NOT NULL DEFAULT false,

    -- Baseline com muitos meses ausentes: o conjunto mal aparece na base, e
    -- ausência de envio não é o mesmo que ausência de interrupção.
    baseline_esburacado  boolean NOT NULL DEFAULT false,

    criado_em  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (pipeline_run_id, conjunto_id, competencia_ano, competencia_mes),
    CONSTRAINT anomalias_situacao_valida CHECK (situacao IN (
        'avaliado', 'conjunto_invalido', 'destoante', 'cobertura',
        'denominador', 'sem_baseline')),
    CONSTRAINT anomalias_severidade_valida CHECK (
        severidade IS NULL OR severidade IN ('alta', 'moderada', 'normal', 'queda'))
);

-- A fila: uma execução, uma competência, ordenada por consumidores afetados.
-- A ordenação é essa de propósito — um conjunto de 200 consumidores com
-- desvio enorme importa menos que um de 80 mil com desvio moderado.
CREATE INDEX anomalias_fila_idx
    ON anomalias (pipeline_run_id, competencia_ano, competencia_mes,
                  consumidores_afetados DESC)
    WHERE situacao = 'avaliado';
