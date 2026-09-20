/** Boletim: estado da carga e o que mudou desde a competência anterior. */

import { Pool } from 'pg';

export interface LinhaCarga {
  id: number;
  status: string;
  finalizado_em: Date | null;
  arquivo_origem: string;
  linhas_processadas: number;
  linhas_inseridas: number;
  linhas_atualizadas: number;
  distribuidoras_ausentes: number;
}

export class BoletimRepository {
  constructor(private readonly pool: Pool) {}

  async carga(runId: number): Promise<LinhaCarga | null> {
    const { rows } = await this.pool.query<LinhaCarga>(
      `SELECT id, status, finalizado_em, arquivo_origem,
              linhas_processadas, linhas_inseridas, linhas_atualizadas,
              distribuidoras_ausentes
         FROM pipeline_runs WHERE id = $1`,
      [runId],
    );
    return rows[0] ?? null;
  }

  /** Contagem por situação e severidade numa competência. */
  async contagens(
    runId: number,
    ano: number,
    mes: number,
  ): Promise<Array<{ situacao: string; severidade: string | null; total: number }>> {
    const { rows } = await this.pool.query(
      `SELECT situacao, severidade, count(*)::int AS total
         FROM anomalias
        WHERE pipeline_run_id = $1 AND competencia_ano = $2 AND competencia_mes = $3
        GROUP BY 1, 2`,
      [runId, ano, mes],
    );
    return rows;
  }

  async distribuidoraMaiorSaturacao(
    runId: number,
    ano: number,
    mes: number,
  ): Promise<{
    cnpj: string;
    sigla: string;
    saturacao_frota: number;
    alertas: number;
    avaliados: number;
  } | null> {
    const { rows } = await this.pool.query(
      `SELECT a.distribuidora_cnpj::text AS cnpj, d.sigla,
              max(a.saturacao_frota) AS saturacao_frota,
              count(*) FILTER (WHERE a.severidade IN ('alta','moderada'))::int AS alertas,
              count(*) FILTER (WHERE a.situacao = 'avaliado')::int AS avaliados
         FROM anomalias a
         JOIN distributors d ON d.cnpj = a.distribuidora_cnpj
        WHERE a.pipeline_run_id = $1 AND a.competencia_ano = $2 AND a.competencia_mes = $3
        GROUP BY 1, 2
       HAVING max(a.saturacao_frota) IS NOT NULL
        ORDER BY max(a.saturacao_frota) DESC, alertas DESC
        LIMIT 1`,
      [runId, ano, mes],
    );
    return rows[0] ?? null;
  }

  async distribuidorasAusentes(
    runId: number,
    ano: number,
    mes: number,
  ): Promise<
    Array<{
      cnpj: string;
      sigla: string;
      conjuntos: number;
      ultimo_envio_ano: number | null;
      ultimo_envio_mes: number | null;
    }>
  > {
    const { rows } = await this.pool.query(
      `SELECT a.distribuidora_cnpj::text AS cnpj, d.sigla,
              count(*)::int AS conjuntos,
              d.ultimo_envio_ano, d.ultimo_envio_mes
         FROM anomalias a
         JOIN distributors d ON d.cnpj = a.distribuidora_cnpj
        WHERE a.pipeline_run_id = $1 AND a.competencia_ano = $2 AND a.competencia_mes = $3
          AND a.motivo_ausencia = 'distribuidora_ausente'
        GROUP BY 1, 2, 4, 5
        ORDER BY conjuntos DESC`,
      [runId, ano, mes],
    );
    return rows;
  }

  /** Delta entre a competência e a anterior da mesma execução: quem entrou na
   *  fila, quem saiu, e os maiores entrantes. */
  async delta(
    runId: number,
    ano: number,
    mes: number,
    anoAnt: number,
    mesAnt: number,
  ): Promise<{
    alertas_anterior: number;
    entraram: number;
    sairam: number;
    pioraram: Array<{
      conjunto_id: number;
      conjunto_nome: string | null;
      cnpj: string;
      sigla: string;
      de: string;
      para: string;
      consumidores_afetados: string;
    }>;
  }> {
    const alerta = `severidade IN ('alta','moderada')`;

    const { rows: resumo } = await this.pool.query(
      `WITH atual AS (
           SELECT conjunto_id FROM anomalias
            WHERE pipeline_run_id = $1 AND competencia_ano = $2 AND competencia_mes = $3
              AND ${alerta}),
       anterior AS (
           SELECT conjunto_id FROM anomalias
            WHERE pipeline_run_id = $1 AND competencia_ano = $4 AND competencia_mes = $5
              AND ${alerta})
       SELECT (SELECT count(*) FROM anterior)::int AS alertas_anterior,
              (SELECT count(*) FROM atual a
                WHERE NOT EXISTS (SELECT 1 FROM anterior b WHERE b.conjunto_id = a.conjunto_id))::int AS entraram,
              (SELECT count(*) FROM anterior b
                WHERE NOT EXISTS (SELECT 1 FROM atual a WHERE a.conjunto_id = b.conjunto_id))::int AS sairam`,
      [runId, ano, mes, anoAnt, mesAnt],
    );

    // Piora de severidade: o conjunto já estava na fila e subiu de patamar.
    // Diz mais que "entrou na fila", porque a fila se renova quase inteira
    // todo mês.
    const { rows: pioraram } = await this.pool.query(
      `SELECT a.conjunto_id::int AS conjunto_id, c.nome AS conjunto_nome,
              a.distribuidora_cnpj::text AS cnpj, d.sigla,
              b.severidade AS de, a.severidade AS para,
              a.consumidores_afetados::text AS consumidores_afetados
         FROM anomalias a
         JOIN anomalias b
           ON b.pipeline_run_id = a.pipeline_run_id AND b.conjunto_id = a.conjunto_id
          AND b.competencia_ano = $4 AND b.competencia_mes = $5
         JOIN conjuntos c ON c.conjunto_id = a.conjunto_id
         JOIN distributors d ON d.cnpj = a.distribuidora_cnpj
        WHERE a.pipeline_run_id = $1 AND a.competencia_ano = $2 AND a.competencia_mes = $3
          AND a.severidade = 'alta' AND b.severidade = 'moderada'
        ORDER BY a.consumidores_afetados DESC NULLS LAST
        LIMIT 5`,
      [runId, ano, mes, anoAnt, mesAnt],
    );

    return {
      alertas_anterior: resumo[0].alertas_anterior,
      entraram: resumo[0].entraram,
      sairam: resumo[0].sairam,
      pioraram,
    };
  }

  /** Conjuntos na fila em N competências seguidas terminando na atual.
   *  Reincidência é o que a comparação entre execuções revela e a fila
   *  sozinha não mostra. */
  async reincidentes(
    runId: number,
    ano: number,
    mes: number,
    meses: number,
  ): Promise<
    Array<{
      conjunto_id: number;
      conjunto_nome: string | null;
      cnpj: string;
      sigla: string;
      severidade: string;
      meses_seguidos: number;
      consumidores_afetados: string;
    }>
  > {
    const { rows } = await this.pool.query(
      `WITH janela AS (
           SELECT generate_series(($1 * 12 + $2 - 1) - ($3 - 1), $1 * 12 + $2 - 1) AS idx),
       presentes AS (
           SELECT conjunto_id, count(*)::int AS meses_seguidos
             FROM anomalias
            WHERE pipeline_run_id = $4
              AND severidade IN ('alta','moderada')
              AND (competencia_ano * 12 + competencia_mes - 1) IN (SELECT idx FROM janela)
            GROUP BY 1
           HAVING count(*) = $3)
       SELECT a.conjunto_id::int AS conjunto_id, c.nome AS conjunto_nome,
              a.distribuidora_cnpj::text AS cnpj, d.sigla, a.severidade,
              p.meses_seguidos,
              a.consumidores_afetados::text AS consumidores_afetados
         FROM presentes p
         JOIN anomalias a ON a.conjunto_id = p.conjunto_id
          AND a.pipeline_run_id = $4 AND a.competencia_ano = $1 AND a.competencia_mes = $2
         JOIN conjuntos c ON c.conjunto_id = a.conjunto_id
         JOIN distributors d ON d.cnpj = a.distribuidora_cnpj
        ORDER BY a.consumidores_afetados DESC NULLS LAST
        LIMIT 5`,
      [ano, mes, meses, runId],
    );
    return rows;
  }
}
