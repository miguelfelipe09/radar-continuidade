import express, { Express } from 'express';
import { Pool } from 'pg';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi';
import { cors } from './middlewares/cors';
import { naoEncontrado, tratadorDeErro } from './middlewares/erro';
import { registrarAcesso } from './middlewares/log';
import { criarRotas } from './routes';

export function criarApp(pool: Pool): Express {
  const app = express();

  app.use(express.json());
  app.use(cors);
  app.use(registrarAcesso);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1', criarRotas(pool));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(naoEncontrado);
  app.use(tratadorDeErro);

  return app;
}
