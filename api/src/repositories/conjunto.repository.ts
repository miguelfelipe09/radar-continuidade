/** Detalhe de um conjunto.
 *
 * Único lugar que toca a tabela de fatos (25M de linhas), e sempre filtrado
 * por conjunto e competência — o índice
 * (conjunto_id, competencia_ano, competencia_mes) cobre o acesso.
 */

import { Pool } from 'pg';

export interface LinhaSerie {
  competencia_ano: number;
  competencia_mes: number;
  dec_aprox: number | null;
  fec_aprox: number | null;
  eventos: number;
  consumidores_afetados: string;
  destoante: boolean;
}

export class ConjuntoRepository {
  constructor(private readonly pool: Pool) {}

  async cabecalho(
    conjuntoId: number,
  ): Promise<{ conjunto_id: number; nome: string | null; cnpj: string; sigla: string } | null> {
    const { rows } = await this.pool.query(
      `SELECT c.conjunto_id::int AS conjunto_id, c.nome,
              c.distribuidora_cnpj::text AS cnpj, d.sigla
         FROM conjuntos c JOIN distributors d ON d.cnpj = c.distribuidora_cnpj
        WHERE c.conjunto_id = $1`,
      [conjuntoId],
    );
    return rows[0] ?? null;
  }

  async serie(conjuntoId: number): Promise<LinhaSerie[]> {
    const { rows } = await this.pool.query<LinhaSerie>(
      `SELECT competencia_ano, competencia_mes, dec_aprox, fec_aprox,
              eventos, consumidores_afetados::text AS consumidores_afetados, destoante
         FROM conjunto_competencia
        WHERE conjunto_id = $1
        ORDER BY competencia_ano, competencia_mes`,
      [conjuntoId],
    );
    return rows;
  }

  /** Mesmo mês, todos os anos: é a comparação que o baseline usa como
   *  referência sazonal, e a que o analista espera ver. */
  async mesmoMes(
    conjuntoId: number,
    mes: number,
  ): Promise<Array<{ competencia_ano: number; dec_aprox: number | null }>> {
    const { rows } = await this.pool.query(
      `SELECT competencia_ano, dec_aprox
         FROM conjunto_competencia
        WHERE conjunto_id = $1 AND competencia_mes = $2
        ORDER BY competencia_ano`,
      [conjuntoId, mes],
    );
    return rows;
  }

  async causas(
    conjuntoId: number,
    ano: number,
    mes: number,
  ): Promise<
    Array<{
      causa: string | null;
      eventos: number;
      consumidores_afetados: string;
      consumidor_horas: number;
    }>
  > {
    const { rows } = await this.pool.query(
      `SELECT causa_bruta AS causa,
              count(*)::int AS eventos,
              sum(consumidores_afetados)::text AS consumidores_afetados,
              sum(consumidores_afetados::double precision * duracao_minutos / 60.0)
                  AS consumidor_horas
         FROM interrupcoes
        WHERE conjunto_id = $1 AND competencia_ano = $2 AND competencia_mes = $3
        GROUP BY 1
        ORDER BY consumidor_horas DESC
        LIMIT 10`,
      [conjuntoId, ano, mes],
    );
    return rows;
  }

  async alimentadores(
    conjuntoId: number,
    ano: number,
    mes: number,
  ): Promise<
    Array<{
      codigo: string;
      eventos: number;
      consumidores_afetados: string;
      consumidor_horas: number;
    }>
  > {
    const { rows } = await this.pool.query(
      `SELECT alimentador AS codigo,
              count(*)::int AS eventos,
              sum(consumidores_afetados)::text AS consumidores_afetados,
              sum(consumidores_afetados::double precision * duracao_minutos / 60.0)
                  AS consumidor_horas
         FROM interrupcoes
        WHERE conjunto_id = $1 AND competencia_ano = $2 AND competencia_mes = $3
          AND layout_origem = 'new' AND alimentador <> ''
        GROUP BY 1
        ORDER BY consumidor_horas DESC
        LIMIT 20`,
      [conjuntoId, ano, mes],
    );
    return rows;
  }
}
