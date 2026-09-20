import { config } from '../config';
import { erroNaoEncontrado } from '../middlewares/erro';
import { formatarCnpj } from '../middlewares/validacao';
import { ItemRanking, RespostaRanking } from '../models';
import { ContextoRepository } from '../repositories/contexto.repository';
import { RankingRepository } from '../repositories/ranking.repository';
import { competenciaDto, num } from './mapeadores';

export type OrdemRanking = 'dec_aprox' | 'fec_aprox' | 'variacao';

export class RankingService {
  constructor(
    private readonly rankingRepo: RankingRepository,
    private readonly contextoRepo: ContextoRepository,
  ) {}

  async listar(
    ano: number | undefined,
    mes: number | undefined,
    ordem: OrdemRanking,
    limite: number,
  ): Promise<RespostaRanking> {
    const ctx = await this.contextoRepo.atual(ano, mes);
    if (!ctx) throw erroNaoEncontrado('Não há detecção para a competência pedida.');

    // O repositório já devolve ordenado por dec_aprox; as demais ordens são
    // reordenação em memória sobre 52 linhas, não vale outra consulta.
    const linhas = await this.rankingRepo.listar(ctx.runId, ctx.ano, ctx.mes, 100);

    const itens: ItemRanking[] = linhas.map((l) => {
      const sobreposicao = l.conjuntos > 0 ? l.conjuntos_comparaveis / l.conjuntos : 0;
      const comparavel =
        sobreposicao >= config.minimoSobreposicao &&
        l.dec_anterior_pareado !== null &&
        l.dec_atual_pareado !== null &&
        l.dec_anterior_pareado > 0;

      const variacao = comparavel
        ? ((l.dec_atual_pareado! - l.dec_anterior_pareado!) / l.dec_anterior_pareado!) * 100
        : null;

      return {
        posicao: 0,
        distribuidora: { sigla: l.sigla, cnpj: formatarCnpj(l.cnpj) },
        conjuntos: l.conjuntos,
        consumidores_ativos: Number(l.consumidores_ativos),
        dec_aprox: num(l.dec_aprox)!,
        fec_aprox: num(l.fec_aprox)!,
        ano_anterior: {
          dec_aprox: comparavel ? num(l.dec_anterior_pareado) : null,
          variacao_pct: num(variacao, 1),
          conjuntos_comparaveis: l.conjuntos_comparaveis,
          sobreposicao: num(sobreposicao, 3)!,
          ...(comparavel ? {} : { motivo: 'sobreposicao_insuficiente' as const }),
        },
        alertas: { alta: l.alertas_alta, moderada: l.alertas_moderada },
        saturacao_frota: num(l.saturacao_frota, 4),
      };
    });

    if (ordem === 'fec_aprox') {
      itens.sort((a, b) => b.fec_aprox - a.fec_aprox);
    } else if (ordem === 'variacao') {
      itens.sort(
        (a, b) =>
          (b.ano_anterior.variacao_pct ?? -Infinity) -
          (a.ano_anterior.variacao_pct ?? -Infinity),
      );
    }

    const recortado = itens.slice(0, limite);
    recortado.forEach((item, i) => {
      item.posicao = i + 1;
    });

    return {
      competencia: competenciaDto(ctx.ano, ctx.mes),
      ordem,
      itens: recortado,
    };
  }
}
