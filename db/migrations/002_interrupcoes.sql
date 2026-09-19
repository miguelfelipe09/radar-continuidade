-- =====================================================================
-- 002 — Interrupções (tabela de fatos)
--
-- Sem chave estrangeira para conjuntos nem municipalities: são ~25M linhas
-- entrando por COPY e a verificação linha a linha custaria caro, além de
-- obrigar a popular as dimensões numa passada anterior. A integridade
-- referencial fica a cargo do ETL. Decisão consciente de performance.
-- =====================================================================

CREATE TABLE interrupcoes (
    id  bigserial PRIMARY KEY,

    -- De qual era veio o registro. O ETL tem um adaptador por layout
    -- convergindo para este modelo canônico (ACHADOS §1).
    layout_origem  text NOT NULL,

    -- --- chave natural (ACHADOS §5) --------------------------------------
    -- Layout novo: (cnpj, cod_interrupcao, dat_inicio) fecha após dedup, e
    -- seq fica sempre em 1. Layout antigo: nenhuma combinação é única, 3%
    -- das ocorrências se desdobram em até 81 linhas — seq vem de
    -- row_number() particionado pelas demais colunas da chave.
    --
    -- alimentador entra como string vazia quando ausente na origem (58
    -- linhas em 2024, 821 em 2025): em índice único do Postgres NULL não
    -- conflita com NULL, e a garantia de unicidade evaporaria justamente
    -- nessas linhas.
    distribuidora_cnpj  bigint    NOT NULL,
    cod_interrupcao     text      NOT NULL,  -- NumOrdemInterrupcao (antigo) / CodInterrupcao (novo)
    conjunto_id         bigint    NOT NULL,
    alimentador         text      NOT NULL DEFAULT '',
    dat_inicio          timestamp NOT NULL,
    seq                 integer   NOT NULL DEFAULT 1,

    -- Linhas sem data de fim são descartadas no ETL (20.299 em 2026 — as
    -- mesmas linhas também não têm data de início). Sem fim não há
    -- consumidor-hora calculável.
    dat_fim  timestamp NOT NULL,

    -- Eixo temporal do projeto. No layout novo vem pronta; no antigo é
    -- derivada de dat_inicio (ACHADOS §8).
    competencia_ano  smallint NOT NULL,
    competencia_mes  smallint NOT NULL,

    duracao_minutos  integer GENERATED ALWAYS AS
        ((extract(epoch FROM (dat_fim - dat_inicio)) / 60)::integer) STORED,

    consumidores_afetados  integer NOT NULL,

    -- Nulo no layout antigo (campo não existe) e no novo quando o código
    -- não tem 7 dígitos (ACHADOS §10).
    municipio_ibge  integer,

    tipo         text,
    causa_bruta  text,  -- texto bruto, sem normalização (ACHADOS §7)

    -- Nulo no layout antigo significa desconhecido, não "sem expurgo" — por
    -- isso expurgado preserva o nulo em vez de virar false, que enviesaria
    -- qualquer filtro por expurgado = false. No layout novo o campo nunca é
    -- nulo: quando não há expurgo vem o texto "Não houve Expurgo"
    -- (ACHADOS §6).
    motivo_expurgo  text,
    expurgado       boolean GENERATED ALWAYS AS (
        CASE WHEN motivo_expurgo IS NULL THEN NULL
             ELSE motivo_expurgo <> 'Não houve Expurgo'
        END
    ) STORED,

    -- Só existem no layout novo.
    cod_evento      text,
    cod_ocorrencia  text,

    criado_em  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT interrupcoes_layout_origem_valido
        CHECK (layout_origem IN ('legacy', 'new')),
    CONSTRAINT interrupcoes_mes_valido
        CHECK (competencia_mes BETWEEN 1 AND 12),
    CONSTRAINT interrupcoes_chave_natural
        UNIQUE (distribuidora_cnpj, cod_interrupcao, conjunto_id, alimentador, dat_inicio, seq)
);

-- Drill-down: série de um conjunto ao longo das competências.
CREATE INDEX interrupcoes_conjunto_competencia_idx
    ON interrupcoes (conjunto_id, competencia_ano, competencia_mes);

-- Fila de investigação: uma competência, ordenada por consumidores afetados.
CREATE INDEX interrupcoes_competencia_severidade_idx
    ON interrupcoes (competencia_ano, competencia_mes, consumidores_afetados DESC);
