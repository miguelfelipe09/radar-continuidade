/** Rotas: só vinculam caminho ao controller. Nenhuma lógica aqui. */

import { Router } from 'express';
import { Pool } from 'pg';
import {
  BoletimController,
  CompetenciasController,
  ConjuntoController,
  FilaController,
  RankingController,
} from '../controllers';
import { assincrono } from '../middlewares/erro';
import { BoletimRepository } from '../repositories/boletim.repository';
import { ConjuntoRepository } from '../repositories/conjunto.repository';
import { ContextoRepository } from '../repositories/contexto.repository';
import { FilaRepository } from '../repositories/fila.repository';
import { RankingRepository } from '../repositories/ranking.repository';
import { BoletimService } from '../services/boletim.service';
import { CompetenciasService } from '../services/competencias.service';
import { ConjuntoService } from '../services/conjunto.service';
import { FilaService } from '../services/fila.service';
import { RankingService } from '../services/ranking.service';

export function criarRotas(pool: Pool): Router {
  const contextoRepo = new ContextoRepository(pool);
  const filaRepo = new FilaRepository(pool);
  const boletimRepo = new BoletimRepository(pool);
  const rankingRepo = new RankingRepository(pool);
  const conjuntoRepo = new ConjuntoRepository(pool);

  const boletim = new BoletimController(
    new BoletimService(boletimRepo, filaRepo, contextoRepo),
  );
  const ranking = new RankingController(
    new RankingService(rankingRepo, contextoRepo),
  );
  const fila = new FilaController(new FilaService(filaRepo, contextoRepo));
  const conjunto = new ConjuntoController(
    new ConjuntoService(conjuntoRepo, filaRepo, contextoRepo),
  );

  const competencias = new CompetenciasController(
    new CompetenciasService(contextoRepo),
  );

  const router = Router();
  router.get('/competencias', assincrono(competencias.listar));
  router.get('/boletim', assincrono(boletim.boletim));
  router.get('/ranking', assincrono(ranking.ranking));
  router.get('/fila', assincrono(fila.fila));
  router.get('/conjuntos/:id', assincrono(conjunto.detalhe));
  return router;
}
