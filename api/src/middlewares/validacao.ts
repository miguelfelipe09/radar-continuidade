/** Parsers de entrada. Erram cedo, com mensagem que diz o formato esperado. */

import { erroRequisicao } from './erro';
import { Competencia, Severidade, Situacao } from '../models';

const SEVERIDADES: Severidade[] = ['alta', 'moderada', 'normal', 'queda'];
const SITUACOES: Situacao[] = [
  'avaliado',
  'ausente',
  'conjunto_invalido',
  'destoante',
  'cobertura',
  'denominador',
  'sem_baseline',
];

export function competencia(valor: unknown): Competencia | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const texto = String(valor);
  const casa = /^(\d{4})-(\d{2})$/.exec(texto);
  if (!casa) {
    throw erroRequisicao(
      `competência inválida: "${texto}". Formato esperado AAAA-MM, por exemplo 2026-07.`,
    );
  }
  const ano = Number(casa[1]);
  const mes = Number(casa[2]);
  if (mes < 1 || mes > 12) {
    throw erroRequisicao(`mês inválido em "${texto}": esperado entre 01 e 12.`);
  }
  return { ano, mes, rotulo: rotulo(ano, mes) };
}

export function rotulo(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** "mar/2026". Usado nas frases que a API escreve prontas para leitura —
 *  o formato AAAA-MM é de máquina e não deve aparecer em texto corrido. */
export function competenciaLegivel(ano: number, mes: number): string {
  return `${MESES[mes - 1] ?? mes}/${ano}`;
}

export function inteiro(
  valor: unknown,
  nome: string,
  padrao: number,
  minimo: number,
  maximo: number,
): number {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < minimo || n > maximo) {
    throw erroRequisicao(
      `${nome} inválido: "${valor}". Esperado inteiro entre ${minimo} e ${maximo}.`,
    );
  }
  return n;
}

function lista<T extends string>(
  valor: unknown,
  nome: string,
  permitidos: readonly T[],
): T[] | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const itens = String(valor)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const item of itens) {
    if (!permitidos.includes(item as T)) {
      throw erroRequisicao(
        `${nome} inválido: "${item}". Valores aceitos: ${permitidos.join(', ')}.`,
      );
    }
  }
  return itens as T[];
}

export const severidades = (valor: unknown) =>
  lista(valor, 'severidade', SEVERIDADES);

export const situacoes = (valor: unknown) =>
  lista(valor, 'situacao', SITUACOES);

export function cnpj(valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const texto = String(valor).replace(/\D/g, '');
  if (texto.length < 13 || texto.length > 14) {
    throw erroRequisicao(
      `CNPJ inválido: "${valor}". Esperado 14 dígitos, por exemplo 60444437000146.`,
    );
  }
  return texto;
}

export function idNumerico(valor: unknown, nome: string): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 0) {
    throw erroRequisicao(`${nome} inválido: "${valor}". Esperado inteiro.`);
  }
  return n;
}

/** O CNPJ é bigint no banco e perde o zero à esquerda. */
export function formatarCnpj(valor: string | number): string {
  return String(valor).padStart(14, '0');
}
