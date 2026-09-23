-- =====================================================================
-- Simulação de retificação da ANEEL — utilitário de demonstração
--
-- Isto NÃO faz parte do pipeline. Existe porque a ANEEL **substitui** o
-- arquivo do ano a cada publicação: não há como baixar a versão do mês
-- passado para demonstrar que o ETL corrige registros retificados sem
-- duplicar nada.
--
-- O script adultera 1.000 linhas já carregadas, deixando-as como se fossem
-- a versão anterior do dado. A carga seguinte, lendo o arquivo real, deve
-- detectar exatamente essas 1.000 e reportá-las como atualizadas.
--
-- Determinístico: sempre as mesmas 1.000 linhas, então o número esperado não
-- depende de sorte.
--
--   docker compose run --rm --entrypoint sh migrate \
--       -c 'psql -f /db/simular-retificacao.sql'
-- =====================================================================

BEGIN;

CREATE TEMP TABLE alvo ON COMMIT DROP AS
SELECT id FROM interrupcoes
WHERE competencia_ano = 2026 AND competencia_mes = 3
ORDER BY id
LIMIT 1000;

-- Duas colunas mutáveis, das que o upsert compara para decidir se a linha
-- mudou: público atingido e horário de religamento.
UPDATE interrupcoes i
   SET consumidores_afetados = i.consumidores_afetados + 1000,
       dat_fim               = i.dat_fim + interval '30 minutes'
  FROM alvo a
 WHERE i.id = a.id;

SELECT count(*) AS linhas_adulteradas FROM alvo;

COMMIT;
