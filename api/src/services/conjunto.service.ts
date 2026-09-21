import { erroNaoEncontrado } from '../middlewares/erro';
import { formatarCnpj, rotulo } from '../middlewares/validacao';
import { RespostaConjunto } from '../models';
import { ConjuntoRepository } from '../repositories/conjunto.repository';
import { ContextoRepository } from '../repositories/contexto.repository';
import { FilaRepository } from '../repositories/fila.repository';
import { competenciaDto, itemFila, num } from './mapeadores';

/** O código de alimentador só é utilizável no layout novo: metade dos
 *  códigos não sobrevive à virada de 2026 (ACHADOS §2). */
const PRIMEIRO_ANO_COM_ALIMENTADOR = 2026;

export class ConjuntoService {
  constructor(
    private readonly conjuntoRepo: ConjuntoRepository,
    private readonly filaRepo: FilaRepository,
    private readonly contextoRepo: ContextoRepository,
  ) {}

  async detalhar(
    conjuntoId: number,
    ano?: number,
    mes?: number,
  ): Promise<RespostaConjunto> {
    const cabecalho = await this.conjuntoRepo.cabecalho(conjuntoId);
    if (!cabecalho) {
      throw erroNaoEncontrado(`Conjunto ${conjuntoId} não existe.`);
    }

    const ctx = await this.contextoRepo.atual(ano, mes);
    if (!ctx) throw erroNaoEncontrado('Não há detecção para a competência pedida.');

    const temAlimentador = ctx.ano >= PRIMEIRO_ANO_COM_ALIMENTADOR;

    const [resumo, serie, mesmoMes, causas, alimentadores, indice] = await Promise.all([
      this.filaRepo.porConjunto(ctx.runId, ctx.ano, ctx.mes, conjuntoId),
      this.conjuntoRepo.serie(conjuntoId),
      this.conjuntoRepo.mesmoMes(conjuntoId, ctx.mes),
      this.conjuntoRepo.causas(conjuntoId, ctx.ano, ctx.mes),
      temAlimentador
        ? this.conjuntoRepo.alimentadores(conjuntoId, ctx.ano, ctx.mes)
        : Promise.resolve([]),
      this.conjuntoRepo.indiceSazonal(ctx.runId, ctx.ano, ctx.mes),
    ]);

    // O baseline é apurado na escala dessazonalizada. Para a série de DEC
    // bruto, cada mês tem seu próprio limiar: o normalizado vezes o fator
    // daquele mês. Desenhar uma reta seria errado nos dois sentidos.
    const baseline = resumo ? {
      mediana: resumo.baseline_mediana,
      limite: resumo.limite_alerta,
    } : null;
    const naEscalaBruta = (valor: number | null, mes: number) =>
      valor === null || baseline === null ? null : num(valor * (indice[mes] ?? 1));

    return {
      conjunto: { id: cabecalho.conjunto_id, nome: cabecalho.nome },
      distribuidora: { sigla: cabecalho.sigla, cnpj: formatarCnpj(cabecalho.cnpj) },
      competencia: competenciaDto(ctx.ano, ctx.mes),
      resumo: resumo ? itemFila(resumo) : null,
      serie: serie.map((p) => ({
        competencia: rotulo(p.competencia_ano, p.competencia_mes),
        ano: p.competencia_ano,
        mes: p.competencia_mes,
        dec_aprox: num(p.dec_aprox),
        fec_aprox: num(p.fec_aprox),
        eventos: p.eventos,
        consumidores_afetados: Number(p.consumidores_afetados),
        destoante: p.destoante,
        baseline_mediana: naEscalaBruta(baseline?.mediana ?? null, p.competencia_mes),
        baseline_limite_alerta: naEscalaBruta(baseline?.limite ?? null, p.competencia_mes),
      })),
      mesmo_mes_anos_anteriores: mesmoMes.map((m) => ({
        competencia: rotulo(m.competencia_ano, ctx.mes),
        dec_aprox: num(m.dec_aprox),
      })),
      causas: causas.map((c) => ({
        causa: c.causa,
        eventos: c.eventos,
        consumidores_afetados: Number(c.consumidores_afetados),
        consumidor_horas: num(c.consumidor_horas, 1)!,
      })),
      alimentadores: alimentadores.map((a) => ({
        codigo: a.codigo,
        eventos: a.eventos,
        consumidores_afetados: Number(a.consumidores_afetados),
        consumidor_horas: num(a.consumidor_horas, 1)!,
      })),
      alimentadores_disponiveis: temAlimentador,
    };
  }
}
