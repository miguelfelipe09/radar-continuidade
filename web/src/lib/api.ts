/** Cliente da API. Um lugar só para montar URL, tratar erro e tipar resposta. */

import type {
  RespostaBoletim,
  RespostaCompetencias,
  RespostaConjunto,
  RespostaFila,
  RespostaRanking,
} from '@/tipos/api';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/** Erro com a mensagem que a API escreveu — ela já vem pronta para leitura. */
export class ErroApi extends Error {
  constructor(
    readonly codigo: string,
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem);
  }
}

async function buscar<T>(caminho: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`/api/v1${caminho}`, BASE);
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== '') url.searchParams.set(chave, String(valor));
  }

  let resposta: Response;
  try {
    resposta = await fetch(url);
  } catch {
    throw new ErroApi(
      'sem_conexao',
      `Não foi possível falar com a API em ${BASE}. Ela está no ar?`,
      0,
    );
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ErroApi(
      corpo?.erro?.codigo ?? 'erro_desconhecido',
      corpo?.erro?.mensagem ?? `A API respondeu ${resposta.status}.`,
      resposta.status,
    );
  }

  return (await resposta.json()) as T;
}

export interface FiltrosFila {
  competencia?: string;
  severidade?: string;
  situacao?: string;
  distribuidora?: string;
  agrupar?: 'nenhum' | 'distribuidora';
  pagina?: number;
  tamanho?: number;
}

export const api = {
  competencias: () => buscar<RespostaCompetencias>('/competencias'),

  boletim: (competencia?: string) =>
    buscar<RespostaBoletim>('/boletim', { competencia }),

  fila: (f: FiltrosFila = {}) => buscar<RespostaFila>('/fila', { ...f }),

  ranking: (competencia?: string, ordem?: string, limite = 20) =>
    buscar<RespostaRanking>('/ranking', { competencia, ordem, limite }),

  conjunto: (id: number, competencia?: string) =>
    buscar<RespostaConjunto>(`/conjuntos/${id}`, { competencia }),
};
