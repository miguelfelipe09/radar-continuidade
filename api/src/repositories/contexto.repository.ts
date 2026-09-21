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

  /** O mês **imediatamente anterior**, se tiver detecção — e nulo se não
   *  tiver.
   *
   *  Não é "a detecção anterior mais próxima". Numa instalação limpa cada
   *  ingestão detectava só a última competência do próprio arquivo, e
   *  julho/2026 tinha como vizinha detectada dezembro/2025: o boletim
   *  comparava os dois, rotulava como competência anterior e listava como
   *  "pioraram" conjuntos que estavam em moderada sete meses antes. Nulo aqui
   *  faz a tela dizer que não há com o que comparar. */
  async anterior(ctx: ContextoExecucao): Promise<{ ano: number; mes: number } | null> {
    const ano = ctx.mes === 1 ? ctx.ano - 1 : ctx.ano;
    const mes = ctx.mes === 1 ? 12 : ctx.mes - 1;
    const { rows } = await this.pool.query(
      `SELECT 1 FROM anomalias
        WHERE competencia_ano = $1 AND competencia_mes = $2
        LIMIT 1`,
      [ano, mes],
    );
    return rows.length > 0 ? { ano, mes } : null;
  }

  /** Competências que têm detecção gravada, da mais recente para a mais
   *  antiga. É o que o seletor pode oferecer: mês sem detecção não tem fila
   *  nem boletim para mostrar. */
  async competencias(): Promise<Array<{ ano: number; mes: number }>> {
    const { rows } = await this.pool.query<{ ano: number; mes: number }>(
      `SELECT DISTINCT competencia_ano AS ano, competencia_mes AS mes
         FROM anomalias
        ORDER BY 1 DESC, 2 DESC`,
    );
    return rows;
  }
}
