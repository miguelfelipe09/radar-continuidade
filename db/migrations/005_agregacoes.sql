-- =====================================================================
-- 005 — Agregação por conjunto × competência
--
-- Grão da fila de investigação e do baseline: ~95 mil linhas contra 25M na
-- tabela de fatos. Repovoada ao fim de cada execução do ETL.
--
-- O formato só pôde ser definido agora porque depende das consultas que a
-- API vai fazer, e não da ingestão.
-- =====================================================================

CREATE TABLE conjunto_competencia (
    conjunto_id         bigint   NOT NULL REFERENCES conjuntos (conjunto_id),
    distribuidora_cnpj  bigint   NOT NULL,
    competencia_ano     smallint NOT NULL,
    competencia_mes     smallint NOT NULL,

    -- volumes: sempre preenchidos, independem do denominador
    eventos                integer          NOT NULL,
    consumidores_afetados  bigint           NOT NULL,
    consumidor_horas       double precision NOT NULL,

    -- denominador, vindo de conjunto_consumidores_ativos
    consumidores_ativos  integer,
    destoante            boolean NOT NULL DEFAULT false,

    -- Indicadores aproximados, reconstruídos do dado bruto — não são o DEC e
    -- o FEC oficiais da ANEEL. Nulos quando o denominador não é confiável:
    -- indicador sem denominador não significa nada, e zero ou -1 acabariam
    -- entrando em alguma média mais adiante.
    dec_aprox  double precision,
    fec_aprox  double precision,

    -- Falso quando a competência tem menos de 50% dos conjuntos do mês de
    -- maior cobertura (ACHADOS §8). Mora aqui, e não na ingestão, porque
    -- compara contra o máximo global, que muda a cada carga.
    cobertura_ok  boolean NOT NULL DEFAULT true,

    atualizado_em  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (conjunto_id, competencia_ano, competencia_mes),
    CONSTRAINT conjunto_competencia_mes_valido
        CHECK (competencia_mes BETWEEN 1 AND 12)
);

-- Fila de investigação: uma competência, ordenada por consumidores afetados.
CREATE INDEX conjunto_competencia_fila_idx
    ON conjunto_competencia (competencia_ano, competencia_mes, consumidores_afetados DESC);

-- Baseline: mesmo mês dos anos anteriores, por conjunto.
CREATE INDEX conjunto_competencia_baseline_idx
    ON conjunto_competencia (conjunto_id, competencia_mes, competencia_ano);
