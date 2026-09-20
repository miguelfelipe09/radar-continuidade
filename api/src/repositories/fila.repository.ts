/** Fila de investigação: lê anomalias, nunca a tabela de fatos. */

import { Pool } from 'pg';
import { Severidade, Situacao } from '../models';

export interface LinhaFila {
  conjunto_id: number;
  conjunto_nome: string | null;
  distribuidora_cnpj: string;
  distribuidora_sigla: string;
  situacao: Situacao;
  severidade: Severidade | null;
  motivo_ausencia: string | null;
  consumidores_afetados: string | null;
  consumidores_ativos: number | null;
  eventos: number | null;
  dec_aprox: number | null;
  dec_normalizado: number | null;
  baseline_mediana: number | null;
  baseline_iqr: number | null;
  baseline_pontos: number | null;
  limite_alerta: number | null;
  desvio_iqr: number | null;
  reconfiguracao: boolean;
  baseline_esburacado: boolean;
  buracos_envio: number | null;
  buracos_conjunto: number | null;
  saturacao_frota: number | null;
  ultimo_envio_ano: number | null;
  ultimo_envio_mes: number | null;
}

export interface FiltroFila {
  runId: number;
  ano: number;
  mes: number;
  severidades: Severidade[] | null;
  situacoes: Situacao[] | null;
  cnpj: string | null;
  limite: number;
  deslocamento: number;
}

const COLUNAS = `
    a.conjunto_id::int             AS conjunto_id,
    c.nome                        AS conjunto_nome,
    a.distribuidora_cnpj::text    AS distribuidora_cnpj,
    d.sigla                       AS distribuidora_sigla,
    a.situacao,
    a.severidade,
    a.motivo_ausencia,
    a.consumidores_afetados::text AS consumidores_afetados,
    a.consumidores_ativos,
    a.eventos,
    a.dec_aprox,
    a.dec_normalizado,
    a.baseline_mediana,
    a.baseline_iqr,
    a.baseline_pontos,
    a.limite_alerta,
    a.desvio_iqr,
    a.reconfiguracao,
    a.baseline_esburacado,
    a.buracos_envio,
    a.buracos_conjunto,
    a.saturacao_frota,
    d.ultimo_envio_ano,
    d.ultimo_envio_mes`;

/** Ordem da fila: consumidores afetados, não desvio estatístico. Um conjunto
 *  de 200 consumidores com desvio enorme importa menos que um de 80 mil com
 *  desvio moderado. Ausentes não têm afetados e vão para o fim. */
const ORDEM = `
    ORDER BY a.consumidores_afetados DESC NULLS LAST, a.conjunto_id`;

export class FilaRepository {
  constructor(private readonly pool: Pool) {}

  private condicoes(f: FiltroFila): { where: string; params: unknown[] } {
    const params: unknown[] = [f.runId, f.ano, f.mes];
    let where = `a.pipeline_run_id = $1
                 AND a.competencia_ano = $2 AND a.competencia_mes = $3`;

    if (f.severidades) {
      params.push(f.severidades);
      where += ` AND a.severidade = ANY($${params.length})`;
    }
    if (f.situacoes) {
      params.push(f.situacoes);
      where += ` AND a.situacao = ANY($${params.length})`;
    }
    if (f.cnpj) {
      params.push(f.cnpj);
      where += ` AND a.distribuidora_cnpj = $${params.length}::bigint`;
    }
    return { where, params };
  }

  async listar(f: FiltroFila): Promise<LinhaFila[]> {
    const { where, params } = this.condicoes(f);
    params.push(f.limite, f.deslocamento);
    const { rows } = await this.pool.query<LinhaFila>(
      `SELECT ${COLUNAS}
         FROM anomalias a
         JOIN conjuntos c ON c.conjunto_id = a.conjunto_id
         JOIN distributors d ON d.cnpj = a.distribuidora_cnpj
        WHERE ${where}
        ${ORDEM}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  }

  async contar(f: FiltroFila): Promise<number> {
    const { where, params } = this.condicoes(f);
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT count(*) AS total FROM anomalias a WHERE ${where}`,
      params,
    );
    return Number(rows[0].total);
  }

  async porConjunto(
    runId: number,
    ano: number,
    mes: number,
    conjuntoId: number,
  ): Promise<LinhaFila | null> {
    const { rows } = await this.pool.query<LinhaFila>(
      `SELECT ${COLUNAS}
         FROM anomalias a
         JOIN conjuntos c ON c.conjunto_id = a.conjunto_id
         JOIN distributors d ON d.cnpj = a.distribuidora_cnpj
        WHERE a.pipeline_run_id = $1 AND a.competencia_ano = $2
          AND a.competencia_mes = $3 AND a.conjunto_id = $4`,
      [runId, ano, mes, conjuntoId],
    );
    return rows[0] ?? null;
  }
}
