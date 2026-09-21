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

    // Competência mais recente com detecção, e a execução mais recente que a
    // detectou. A ordem importa: ordenar por execução primeiro faria uma
    // recarga que detectou só um mês esconder as competências posteriores.
    const { rows } = await this.pool.query<{
      pipeline_run_id: number;
      competencia_ano: number;
      competencia_mes: number;
    }>(
      `SELECT max(pipeline_run_id) AS pipeline_run_id, competencia_ano, competencia_mes
         FROM anomalias
        GROUP BY competencia_ano, competencia_mes
        ORDER BY competencia_ano DESC, competencia_mes DESC
        LIMIT 1`,
    );
    if (!rows[0]) return null;
    return {
      runId: rows[0].pipeline_run_id,
      ano: rows[0].competencia_ano,
      mes: rows[0].competencia_mes,
    };
  }

  /** Competência anterior com detecção, **independente da execução**.
   *
   *  Numa carga mensal real cada ingestão cria uma execução e detecta só a
   *  competência nova. Procurar a anterior dentro da mesma execução deixaria
   *  o delta vazio em toda carga — ou, pior, apontaria para uma competência
   *  não adjacente quando a execução detectou vários meses fora de ordem. */
  async anterior(ctx: ContextoExecucao): Promise<{ ano: number; mes: number } | null> {
    const { rows } = await this.pool.query<{
      competencia_ano: number;
      competencia_mes: number;
    }>(
      `SELECT competencia_ano, competencia_mes
         FROM anomalias
        WHERE (competencia_ano * 100 + competencia_mes) < ($1 * 100 + $2)
        GROUP BY competencia_ano, competencia_mes
        ORDER BY competencia_ano DESC, competencia_mes DESC
        LIMIT 1`,
      [ctx.ano, ctx.mes],
    );
    if (!rows[0]) return null;
    return { ano: rows[0].competencia_ano, mes: rows[0].competencia_mes };
  }
}
