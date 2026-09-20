/** Tratamento central de erro. Nenhum controller repete try/catch. */

import { NextFunction, Request, Response } from 'express';
import { RespostaErro } from '../models';

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const erroRequisicao = (mensagem: string) =>
  new ErroHttp(400, 'requisicao_invalida', mensagem);

export const erroNaoEncontrado = (mensagem: string) =>
  new ErroHttp(404, 'nao_encontrado', mensagem);

/** Envolve um handler assíncrono para que a rejeição chegue ao middleware. */
export function assincrono(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export function naoEncontrado(_req: Request, res: Response): void {
  const corpo: RespostaErro = {
    erro: { codigo: 'nao_encontrado', mensagem: 'Rota inexistente.' },
  };
  res.status(404).json(corpo);
}

export function tratadorDeErro(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (erro instanceof ErroHttp) {
    const corpo: RespostaErro = {
      erro: { codigo: erro.codigo, mensagem: erro.message },
    };
    res.status(erro.status).json(corpo);
    return;
  }

  console.error('erro não tratado:', erro);
  const corpo: RespostaErro = {
    erro: {
      codigo: 'erro_interno',
      mensagem: 'Erro interno ao processar a requisição.',
    },
  };
  res.status(500).json(corpo);
}
