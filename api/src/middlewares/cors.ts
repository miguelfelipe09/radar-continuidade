/** CORS para a interface web.
 *
 * Escrito à mão em vez de usar o pacote `cors`: são poucas linhas, e o
 * projeto tem uma lista curta e explícita de dependências.
 *
 * As origens permitidas vêm de CORS_ORIGINS, separadas por vírgula. O
 * padrão cobre o Vite em desenvolvimento.
 */

import { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export function cors(req: Request, res: Response, next: NextFunction): void {
  const origem = req.headers.origin;

  if (origem && config.origensPermitidas.includes(origem)) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    // A resposta varia conforme a origem: sem isto, um cache intermediário
    // serviria a resposta de uma origem para outra.
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
}
