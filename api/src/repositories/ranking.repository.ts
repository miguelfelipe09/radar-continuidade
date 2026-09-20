/** Ranking de piores indicadores por distribuidora.
 *
 * A comparação com o ano anterior é **pareada**: só entram os conjuntos
 * presentes nas duas competências. A frota muda entre anos — a DMED trocou
 * os quatro códigos de conjunto na virada de 2026 — e comparar medianas de
 * frotas diferentes produz variação inventada (ACHADOS §14).
 */

import { Pool } from 'pg';

export interface LinhaRanking {
  cnpj: string;
  sigla: string;
  conjuntos: number;
  consumidores_ativos: string;
  dec_aprox: number;
  fec_aprox: number;
  dec_anterior_pareado: number | null;
  dec_atual_pareado: number | null;
  conjuntos_comparaveis: number;
  alertas_alta: number;
  alertas_moderada: number;
  saturacao_frota: number | null;
}

export class RankingRepository {
  constructor(private readonly pool: Pool) {}

  async listar(
    runId: number,
    ano: number,
    mes: number,
    limite: number,
  ): Promise<LinhaRanking[]> {
    const { rows } = await this.pool.query<LinhaRanking>(
      `WITH atual AS (
           SELECT c.distribuidora_cnpj, cc.conjunto_id, cc.dec_aprox, cc.fec_aprox,
                  cc.consumidores_ativos
             FROM conjunto_competencia cc
             JOIN conjuntos c USING (conjunto_id)
            WHERE cc.competencia_ano = $1 AND cc.competencia_mes = $2
              AND cc.dec_aprox IS NOT NULL),
       anterior AS (
           SELECT cc.conjunto_id, cc.dec_aprox
             FROM conjunto_competencia cc
            WHERE cc.competencia_ano = $1 - 1 AND cc.competencia_mes = $2
              AND cc.dec_aprox IS NOT NULL),
       agregado AS (
           SELECT distribuidora_cnpj,
                  count(*)::int AS conjuntos,
                  sum(consumidores_ativos)::text AS consumidores_ativos,
                  percentile_cont(0.5) WITHIN GROUP (ORDER BY dec_aprox) AS dec_aprox,
                  percentile_cont(0.5) WITHIN GROUP (ORDER BY fec_aprox) AS fec_aprox
             FROM atual GROUP BY 1),
       pareado AS (
           SELECT a.distribuidora_cnpj,
                  count(*)::int AS conjuntos_comparaveis,
                  percentile_cont(0.5) WITHIN GROUP (ORDER BY a.dec_aprox) AS dec_atual_pareado,
                  percentile_cont(0.5) WITHIN GROUP (ORDER BY b.dec_aprox) AS dec_anterior_pareado
             FROM atual a JOIN anterior b USING (conjunto_id)
            GROUP BY 1),
       alertas AS (
           SELECT distribuidora_cnpj,
                  count(*) FILTER (WHERE severidade = 'alta')::int     AS alertas_alta,
                  count(*) FILTER (WHERE severidade = 'moderada')::int AS alertas_moderada,
                  max(saturacao_frota) AS saturacao_frota
             FROM anomalias
            WHERE pipeline_run_id = $3 AND competencia_ano = $1 AND competencia_mes = $2
            GROUP BY 1)
       SELECT g.distribuidora_cnpj::text AS cnpj, d.sigla,
              g.conjuntos, g.consumidores_ativos, g.dec_aprox, g.fec_aprox,
              p.dec_anterior_pareado, p.dec_atual_pareado,
              coalesce(p.conjuntos_comparaveis, 0) AS conjuntos_comparaveis,
              coalesce(al.alertas_alta, 0)     AS alertas_alta,
              coalesce(al.alertas_moderada, 0) AS alertas_moderada,
              al.saturacao_frota
         FROM agregado g
         JOIN distributors d ON d.cnpj = g.distribuidora_cnpj
         LEFT JOIN pareado p  ON p.distribuidora_cnpj = g.distribuidora_cnpj
         LEFT JOIN alertas al ON al.distribuidora_cnpj = g.distribuidora_cnpj
        ORDER BY g.dec_aprox DESC
        LIMIT $4`,
      [ano, mes, runId, limite],
    );
    return rows;
  }
}
