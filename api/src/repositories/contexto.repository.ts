/** Execução e competência correntes. Tudo mais se apoia nisto. */

import { Pool } from 'pg';

export interface ContextoExecucao {
  runId: number;
  ano: number;
  mes: number;
}

export class ContextoRepository {
  constructor(private readonly pool: Pool) {}

  /** Execução mais recente que produziu anomalias, e a competência mais
   *  recente dentro dela. Uma competência pode ser fixada pelo chamador. */
  async atual(ano?: number, mes?: number): Promise<ContextoExecucao | null> {
    if (ano !== undefined && mes !== undefined) {
      const { rows } = await this.pool.query<{ pipeline_run_id: number }>(
        `SELECT max(pipeline_run_id) AS pipeline_run_id
           FROM anomalias
          WHERE competencia_ano = $1 AND competencia_mes = $2`,
        [ano, mes],
      );
      if (!rows[0]?.pipeline_run_id) return null;
      return { runId: rows[0].pipeline_run_id, ano, mes };
    }

    const { rows } = await this.pool.query<{
      pipeline_run_id: number;
      competencia_ano: number;
      competencia_mes: number;
    }>(
      `SELECT pipeline_run_id, competencia_ano, competencia_mes
         FROM anomalias
        ORDER BY pipeline_run_id DESC, competencia_ano DESC, competencia_mes DESC
        LIMIT 1`,
    );
    if (!rows[0]) return null;
    return {
      runId: rows[0].pipeline_run_id,
      ano: rows[0].competencia_ano,
      mes: rows[0].competencia_mes,
    };
  }

  /** Competência imediatamente anterior presente na mesma execução. */
  async anterior(ctx: ContextoExecucao): Promise<{ ano: number; mes: number } | null> {
    const { rows } = await this.pool.query<{
      competencia_ano: number;
      competencia_mes: number;
    }>(
      `SELECT competencia_ano, competencia_mes
         FROM anomalias
        WHERE pipeline_run_id = $1
          AND (competencia_ano * 100 + competencia_mes) < ($2 * 100 + $3)
        ORDER BY competencia_ano DESC, competencia_mes DESC
        LIMIT 1`,
      [ctx.runId, ctx.ano, ctx.mes],
    );
    if (!rows[0]) return null;
    return { ano: rows[0].competencia_ano, mes: rows[0].competencia_mes };
  }
}
