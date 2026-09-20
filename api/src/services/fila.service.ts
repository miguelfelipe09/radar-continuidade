import { erroNaoEncontrado } from '../middlewares/erro';
import { GrupoFila, RespostaFila, Severidade, Situacao } from '../models';
import { ContextoRepository } from '../repositories/contexto.repository';
import { FilaRepository } from '../repositories/fila.repository';
import { competenciaDto, itemFila } from './mapeadores';

export interface ParametrosFila {
  ano?: number;
  mes?: number;
  severidades: Severidade[] | null;
  situacoes: Situacao[] | null;
  cnpj: string | null;
  agrupar: 'nenhum' | 'distribuidora';
  pagina: number;
  tamanho: number;
}

export class FilaService {
  constructor(
    private readonly filaRepo: FilaRepository,
    private readonly contextoRepo: ContextoRepository,
  ) {}

  async listar(p: ParametrosFila): Promise<RespostaFila> {
    const ctx = await this.contextoRepo.atual(p.ano, p.mes);
    if (!ctx) {
      throw erroNaoEncontrado(
        'Não há detecção para a competência pedida. Rode `python -m etl detect`.',
      );
    }

    const filtro = {
      runId: ctx.runId,
      ano: ctx.ano,
      mes: ctx.mes,
      severidades: p.severidades,
      situacoes: p.situacoes,
      cnpj: p.cnpj,
      limite: p.tamanho,
      deslocamento: (p.pagina - 1) * p.tamanho,
    };

    const [linhas, total] = await Promise.all([
      this.filaRepo.listar(filtro),
      this.filaRepo.contar(filtro),
    ]);

    const itens = linhas.map(itemFila);
    const resposta: RespostaFila = {
      competencia: competenciaDto(ctx.ano, ctx.mes),
      total,
      pagina: p.pagina,
      tamanho: p.tamanho,
    };

    if (p.agrupar === 'distribuidora') {
      resposta.grupos = this.agrupar(itens);
    } else {
      resposta.itens = itens;
    }
    return resposta;
  }

  /** Evento regional satura a fila: com 83% da frota alertando, 90 conjuntos
   *  da mesma distribuidora ocupam a lista. Agrupar resolve na apresentação,
   *  sem mexer na detecção. */
  private agrupar(itens: ReturnType<typeof itemFila>[]): GrupoFila[] {
    const mapa = new Map<string, GrupoFila>();
    for (const item of itens) {
      const chave = item.distribuidora.cnpj;
      let grupo = mapa.get(chave);
      if (!grupo) {
        grupo = {
          distribuidora: item.distribuidora,
          alertas: 0,
          saturacao_frota: item.contexto.saturacao_frota,
          evento_regional: item.contexto.evento_regional,
          itens: [],
        };
        mapa.set(chave, grupo);
      }
      if (item.severidade === 'alta' || item.severidade === 'moderada') {
        grupo.alertas += 1;
      }
      grupo.itens.push(item);
    }
    return [...mapa.values()].sort((a, b) => b.alertas - a.alertas);
  }
}
