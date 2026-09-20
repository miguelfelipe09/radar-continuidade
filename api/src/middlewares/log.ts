/** Log de acesso com duração — é como as rotas são medidas. */

import { NextFunction, Request, Response } from 'express';

export function registrarAcesso(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`,
    );
  });
  next();
}
