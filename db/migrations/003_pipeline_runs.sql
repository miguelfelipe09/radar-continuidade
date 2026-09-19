-- =====================================================================
-- 003 — Histórico de execuções do ETL
--
-- Cada carga registra aqui o que entrou e o que as regras de tratamento
-- descartaram ou marcaram (ACHADOS, "regras de tratamento consolidadas").
-- Sem isso, número descartado vira número perdido.
-- =====================================================================

CREATE TABLE pipeline_runs (
    id  bigserial PRIMARY KEY,

    iniciado_em    timestamptz NOT NULL DEFAULT now(),
    finalizado_em  timestamptz,
    status         text NOT NULL DEFAULT 'em_execucao',

    arquivo_origem  text     NOT NULL,  -- parquet processado
    ano_referencia  smallint NOT NULL,
    layout_origem   text     NOT NULL,  -- qual adaptador rodou

    -- Corte de --ate-competencia, quando houver. Nulo = arquivo inteiro.
    competencia_corte_ano  smallint,
    competencia_corte_mes  smallint,

    -- --- contadores das regras de tratamento -----------------------------
    linhas_processadas             integer NOT NULL DEFAULT 0,
    linhas_inseridas               integer NOT NULL DEFAULT 0,
    linhas_atualizadas             integer NOT NULL DEFAULT 0,
    -- Dedup determinística da chave no layout novo (1.298 em 2026).
    linhas_duplicadas_descartadas  integer NOT NULL DEFAULT 0,
    -- Descartadas por não ter data de fim (20.299 em 2026).
    linhas_sem_data_fim            integer NOT NULL DEFAULT 0,
    -- Mantidas, com municipio_ibge nulo (96.256 em 2026, todas da CELG).
    linhas_sem_municipio           integer NOT NULL DEFAULT 0,
    -- Mantidas, duração acima de 7 dias (843 em 2026). Contadas aqui em vez
    -- de marcadas no fato: é volume pequeno e nenhuma consulta filtra por isso.
    linhas_duracao_suspeita        integer NOT NULL DEFAULT 0,

    erro  text,  -- mensagem quando status = 'falha'

    CONSTRAINT pipeline_runs_status_valido
        CHECK (status IN ('em_execucao', 'sucesso', 'falha')),
    CONSTRAINT pipeline_runs_layout_origem_valido
        CHECK (layout_origem IN ('legacy', 'new')),
    CONSTRAINT pipeline_runs_competencia_corte_mes_valido
        CHECK (competencia_corte_mes IS NULL OR competencia_corte_mes BETWEEN 1 AND 12)
);

-- Última execução de cada arquivo, que é a consulta do dia a dia.
CREATE INDEX pipeline_runs_arquivo_idx
    ON pipeline_runs (arquivo_origem, iniciado_em DESC);
