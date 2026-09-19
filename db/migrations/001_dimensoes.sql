-- =====================================================================
-- 001 — Dimensões
--
-- Tabelas pequenas (dezenas a milhares de linhas). Aqui as chaves
-- estrangeiras são baratas e ficam mantidas; na tabela de fatos, não.
-- =====================================================================

-- CNPJ chega como INT64 nas duas eras (NumCPFCNPJ / NumCNPJDistribuidora),
-- com 13 ou 14 dígitos — o zero à esquerda já se perdeu na origem. Guardar
-- como bigint preserva o valor da fonte; formatar é trabalho da API.
CREATE TABLE distributors (
    cnpj       bigint PRIMARY KEY,
    sigla      text,
    nome       text,
    criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Só códigos IBGE de 7 dígitos entram (ACHADOS §10). Os 96.256 malformados
-- de 2026 gravam municipio_ibge nulo no fato, sem linha aqui.
CREATE TABLE municipalities (
    ibge_code  integer PRIMARY KEY,
    uf         char(2) NOT NULL,  -- derivada dos 2 primeiros dígitos do código
    nome       text,
    criado_em  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT municipalities_ibge_7_digitos
        CHECK (ibge_code BETWEEN 1000000 AND 9999999)
);

-- Grão de análise do projeto (ACHADOS §2).
-- Verificado em 2024-2026: 3.262 códigos de conjunto para 3.262 pares
-- (cnpj, conjunto) — o código não colide entre distribuidoras, então é
-- chave primária sozinho.
CREATE TABLE conjuntos (
    conjunto_id         bigint PRIMARY KEY,
    distribuidora_cnpj  bigint NOT NULL REFERENCES distributors (cnpj),
    nome                text,  -- DscConjuntoUnidadeConsumidora
    criado_em           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conjuntos_distribuidora_idx ON conjuntos (distribuidora_cnpj);

-- Consumidores ativos é atributo do conjunto-mês, não da interrupção
-- (ACHADOS §4): a ANEEL o trata como valor de referência mensal do
-- conjunto, não como contagem no instante do evento. É o denominador do
-- DEC/FEC aproximado.
CREATE TABLE conjunto_consumidores_ativos (
    conjunto_id          bigint   NOT NULL REFERENCES conjuntos (conjunto_id),
    competencia_ano      smallint NOT NULL,
    competencia_mes      smallint NOT NULL,
    consumidores_ativos  integer  NOT NULL,  -- moda dentro do conjunto-mês
    -- Conjunto-mês cujo valor destoa mais de 3x da mediana anual do próprio
    -- conjunto fica fora do indicador normalizado (13 casos em 36.838).
    destoante            boolean  NOT NULL DEFAULT false,
    criado_em            timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (conjunto_id, competencia_ano, competencia_mes),
    CONSTRAINT conjunto_consumidores_ativos_mes_valido
        CHECK (competencia_mes BETWEEN 1 AND 12)
);

-- Redesenho de conjuntos com vigência em abril/2025 (ACHADOS §4): mudança
-- administrativa, não anomalia operacional. A fila de investigação usa esta
-- marcação para apresentar nota em vez de alerta.
CREATE TABLE conjunto_reconfiguracoes (
    conjunto_id      bigint   NOT NULL REFERENCES conjuntos (conjunto_id),
    competencia_ano  smallint NOT NULL,
    competencia_mes  smallint NOT NULL,  -- competência em que a nova configuração passou a valer
    observacao       text,
    criado_em        timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (conjunto_id, competencia_ano, competencia_mes),
    CONSTRAINT conjunto_reconfiguracoes_mes_valido
        CHECK (competencia_mes BETWEEN 1 AND 12)
);
