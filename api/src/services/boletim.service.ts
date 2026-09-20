import { erroNaoEncontrado } from '../middlewares/erro';
import { formatarCnpj, rotulo } from '../middlewares/validacao';
import { RespostaBoletim, Severidade } from '../models';
import { BoletimRepository } from '../repositories/boletim.repository';
import { ContextoRepository } from '../repositories/contexto.repository';
import { FilaRepository } from '../repositories/fila.repository';
import { competenciaDto, itemFila, num } from './mapeadores';

/** Competências seguidas para um conjunto contar como reincidente. Em
 *  07/2026, 8 conjuntos alertam nos 3 meses seguidos, contra 57 que alertam
 *  em 2 dos últimos 3 — três é o corte que ainda cabe numa tela. */
const MESES_REINCIDENCIA = 3;

const EXCLUSOES = [
  'conjunto_invalido',
  'destoante',
  'cobertura',
  'denominador',
] as const;

export class BoletimService {
  constructor(
    private readonly boletimRepo: BoletimRepository,
    private readonly filaRepo: FilaRepository,
    private readonly contextoRepo: ContextoRepository,
  ) {}

  async montar(ano?: number, mes?: number): Promise<RespostaBoletim> {
    const ctx = await this.contextoRepo.atual(ano, mes);
    if (!ctx) throw erroNaoEncontrado('Não há detecção para a competência pedida.');

    const [carga, contagens, maiorSaturacao, ausentes, anterior, topo] =
      await Promise.all([
        this.boletimRepo.carga(ctx.runId),
        this.boletimRepo.contagens(ctx.runId, ctx.ano, ctx.mes),
        this.boletimRepo.distribuidoraMaiorSaturacao(ctx.runId, ctx.ano, ctx.mes),
        this.boletimRepo.distribuidorasAusentes(ctx.runId, ctx.ano, ctx.mes),
        this.contextoRepo.anterior(ctx),
        this.filaRepo.listar({
          runId: ctx.runId,
          ano: ctx.ano,
          mes: ctx.mes,
          severidades: ['alta', 'moderada'] as Severidade[],
          situacoes: null,
          cnpj: null,
          limite: 3,
          deslocamento: 0,
        }),
      ]);

    if (!carga) throw erroNaoEncontrado('Execução do pipeline não encontrada.');

    const porSituacao = new Map<string, number>();
    const porSeveridade = new Map<string, number>();
    for (const c of contagens) {
      porSituacao.set(c.situacao, (porSituacao.get(c.situacao) ?? 0) + c.total);
      if (c.severidade) {
        porSeveridade.set(c.severidade, (porSeveridade.get(c.severidade) ?? 0) + c.total);
      }
    }

    const considerados = [...porSituacao.values()].reduce((a, b) => a + b, 0);
    const alertasAtuais =
      (porSeveridade.get('alta') ?? 0) + (porSeveridade.get('moderada') ?? 0);

    const [delta, reincidentes] = await Promise.all([
      anterior
        ? this.boletimRepo.delta(ctx.runId, ctx.ano, ctx.mes, anterior.ano, anterior.mes)
        : Promise.resolve(null),
      this.boletimRepo.reincidentes(ctx.runId, ctx.ano, ctx.mes, MESES_REINCIDENCIA),
    ]);

    return {
      competencia: competenciaDto(ctx.ano, ctx.mes),
      carga: {
        // pipeline_runs.id é bigserial e o driver devolve texto.
        run_id: Number(carga.id),
        status: carga.status,
        finalizado_em: carga.finalizado_em
          ? carga.finalizado_em.toISOString()
          : null,
        arquivo: carga.arquivo_origem,
        linhas_processadas: Number(carga.linhas_processadas),
        linhas_inseridas: Number(carga.linhas_inseridas),
        linhas_atualizadas: Number(carga.linhas_atualizadas),
        distribuidoras_ausentes: Number(carga.distribuidoras_ausentes),
      },
      cobertura: {
        conjuntos_considerados: considerados,
        avaliados: porSituacao.get('avaliado') ?? 0,
        ausentes: porSituacao.get('ausente') ?? 0,
        sem_baseline: porSituacao.get('sem_baseline') ?? 0,
        excluidos: Object.fromEntries(
          EXCLUSOES.map((s) => [s, porSituacao.get(s) ?? 0]),
        ),
      },
      alertas: {
        alta: porSeveridade.get('alta') ?? 0,
        moderada: porSeveridade.get('moderada') ?? 0,
        normal: porSeveridade.get('normal') ?? 0,
        queda: porSeveridade.get('queda') ?? 0,
      },
      delta: {
        competencia_anterior: anterior ? rotulo(anterior.ano, anterior.mes) : null,
        alertas_atual: alertasAtuais,
        alertas_anterior: delta ? delta.alertas_anterior : null,
        variacao_alertas: delta ? alertasAtuais - delta.alertas_anterior : null,
        entraram_na_fila: delta ? delta.entraram : null,
        sairam_da_fila: delta ? delta.sairam : null,
        pioraram: (delta?.pioraram ?? []).map((p) => ({
          conjunto: { id: p.conjunto_id, nome: p.conjunto_nome },
          distribuidora: { sigla: p.sigla, cnpj: formatarCnpj(p.cnpj) },
          de: p.de as Severidade,
          para: p.para as Severidade,
          consumidores_afetados: Number(p.consumidores_afetados),
        })),
        reincidentes: reincidentes.map((r) => ({
          conjunto: { id: r.conjunto_id, nome: r.conjunto_nome },
          distribuidora: { sigla: r.sigla, cnpj: formatarCnpj(r.cnpj) },
          severidade: r.severidade as Severidade,
          meses_seguidos: r.meses_seguidos,
          consumidores_afetados: Number(r.consumidores_afetados),
        })),
      },
      destaques: {
        maior_saturacao: maiorSaturacao
          ? {
              distribuidora: {
                sigla: maiorSaturacao.sigla,
                cnpj: formatarCnpj(maiorSaturacao.cnpj),
              },
              saturacao_frota: num(maiorSaturacao.saturacao_frota, 4)!,
              alertas: maiorSaturacao.alertas,
              avaliados: maiorSaturacao.avaliados,
            }
          : null,
        distribuidoras_ausentes: ausentes.map((a) => ({
          distribuidora: { sigla: a.sigla, cnpj: formatarCnpj(a.cnpj) },
          conjuntos: a.conjuntos,
          ultimo_envio:
            a.ultimo_envio_ano && a.ultimo_envio_mes
              ? rotulo(a.ultimo_envio_ano, a.ultimo_envio_mes)
              : null,
        })),
        topo_da_fila: topo.map(itemFila),
      },
    };
  }
}
