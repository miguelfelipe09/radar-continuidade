/** Tradução de linha do banco para DTO. Sem Express, sem SQL. */

import { config } from '../config';
import { competenciaLegivel, formatarCnpj, rotulo } from '../middlewares/validacao';
import { LinhaFila } from '../repositories/fila.repository';
import { Competencia, ItemFila, MotivoAusencia, Severidade, Situacao } from '../models';

export function competenciaDto(ano: number, mes: number): Competencia {
  return { ano, mes, rotulo: rotulo(ano, mes) };
}

/** Arredonda para não devolver 11.869999999999999 ao front. */
export function num(valor: number | string | null, casas = 2): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  if (Number.isNaN(n)) return null;
  return Number(n.toFixed(casas));
}

export function inteiro(valor: number | string | null): number | null {
  if (valor === null || valor === undefined) return null;
  return Number(valor);
}

/** Ausência tem três leituras distintas, e a frase precisa separá-las: falta
 *  de dado da fonte, código de conjunto aposentado, e mês sem interrupção.
 *  Só o terceiro é boa notícia. */
function observacaoAusencia(linha: LinhaFila): string {
  const ultimoRegistro =
    linha.ultimo_registro_ano && linha.ultimo_registro_mes
      ? competenciaLegivel(linha.ultimo_registro_ano, linha.ultimo_registro_mes)
      : null;

  if (linha.motivo_ausencia === 'distribuidora_ausente') {
    const desde = linha.ultimo_envio_ano
      ? competenciaLegivel(linha.ultimo_envio_ano, linha.ultimo_envio_mes!)
      : ultimoRegistro;
    return desde
      ? `A distribuidora não envia dados desde ${desde}. Ausência de envio, não de interrupções.`
      : 'A distribuidora não enviou dados nesta competência.';
  }

  if (linha.motivo_ausencia === 'conjunto_encerrado') {
    return ultimoRegistro
      ? `Sem registros desde ${ultimoRegistro}. O código de conjunto provavelmente foi aposentado.`
      : 'Sem registros há vários meses. O código de conjunto provavelmente foi aposentado.';
  }

  return 'Conjunto sem interrupções registradas nesta competência.';
}

export function itemFila(linha: LinhaFila): ItemFila {
  const saturacao = num(linha.saturacao_frota, 4);
  const temBaseline = linha.baseline_mediana !== null && linha.baseline_iqr !== null;

  const item: ItemFila = {
    conjunto: { id: linha.conjunto_id, nome: linha.conjunto_nome },
    distribuidora: {
      sigla: linha.distribuidora_sigla,
      cnpj: formatarCnpj(linha.distribuidora_cnpj),
    },
    situacao: linha.situacao as Situacao,
    severidade: (linha.severidade as Severidade) ?? null,
    consumidores_afetados: inteiro(linha.consumidores_afetados),
    consumidores_ativos: linha.consumidores_ativos,
    eventos: linha.eventos,
    dec_aprox: num(linha.dec_aprox),
    dec_normalizado: num(linha.dec_normalizado),
    baseline: temBaseline
      ? {
          mediana: num(linha.baseline_mediana)!,
          iqr: num(linha.baseline_iqr)!,
          pontos: linha.baseline_pontos ?? 0,
          limite_alerta: num(linha.limite_alerta)!,
        }
      : null,
    desvio_iqr: num(linha.desvio_iqr, 1),
    contexto: {
      reconfiguracao: linha.reconfiguracao,
      baseline_esburacado: linha.baseline_esburacado,
      buracos_envio: linha.buracos_envio ?? 0,
      buracos_conjunto: linha.buracos_conjunto ?? 0,
      saturacao_frota: saturacao,
      frota_avaliada: linha.frota_avaliada,
      // Derivado aqui, não armazenado: é regra de apresentação. Frota
      // inteira alertando é evento sistêmico, não conjunto com problema —
      // mas só quando há frota: uma distribuidora de um conjunto satura em
      // 100% com um único alerta.
      evento_regional:
        (saturacao ?? 0) >= config.limiarEventoRegional &&
        linha.frota_avaliada >= config.minimoFrotaEventoRegional,
      concentrado: linha.concentrado ?? false,
    },
  };

  if (linha.situacao === 'ausente') {
    item.motivo_ausencia = linha.motivo_ausencia as MotivoAusencia;
    item.observacao = observacaoAusencia(linha);
  }

  return item;
}
