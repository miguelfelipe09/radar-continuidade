/** Controllers: validam entrada, chamam o service, montam a resposta HTTP.
 *  Nenhum SQL aqui — se aparecer uma query, a camada está errada. */

import { Request, Response } from 'express';
import { erroRequisicao } from '../middlewares/erro';
import * as v from '../middlewares/validacao';
import { BoletimService } from '../services/boletim.service';
import { CompetenciasService } from '../services/competencias.service';
import { ConjuntoService } from '../services/conjunto.service';
import { FilaService } from '../services/fila.service';
import { OrdemRanking, RankingService } from '../services/ranking.service';

const ORDENS: OrdemRanking[] = ['dec_aprox', 'fec_aprox', 'variacao'];

export class CompetenciasController {
  constructor(private readonly service: CompetenciasService) {}

  listar = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.listar());
  };
}

export class BoletimController {
  constructor(private readonly service: BoletimService) {}

  boletim = async (req: Request, res: Response): Promise<void> => {
    const comp = v.competencia(req.query.competencia);
    res.json(await this.service.montar(comp?.ano, comp?.mes));
  };
}

export class RankingController {
  constructor(private readonly service: RankingService) {}

  ranking = async (req: Request, res: Response): Promise<void> => {
    const comp = v.competencia(req.query.competencia);
    const ordem = (req.query.ordem as OrdemRanking) ?? 'dec_aprox';
    if (!ORDENS.includes(ordem)) {
      throw erroRequisicao(
        `ordem inválida: "${ordem}". Valores aceitos: ${ORDENS.join(', ')}.`,
      );
    }
    const limite = v.inteiro(req.query.limite, 'limite', 20, 1, 100);
    res.json(await this.service.listar(comp?.ano, comp?.mes, ordem, limite));
  };
}

export class FilaController {
  constructor(private readonly service: FilaService) {}

  fila = async (req: Request, res: Response): Promise<void> => {
    const comp = v.competencia(req.query.competencia);
    const agrupar = (req.query.agrupar as string) ?? 'nenhum';
    if (agrupar !== 'nenhum' && agrupar !== 'distribuidora') {
      throw erroRequisicao(
        `agrupar inválido: "${agrupar}". Valores aceitos: nenhum, distribuidora.`,
      );
    }
    res.json(
      await this.service.listar({
        ano: comp?.ano,
        mes: comp?.mes,
        severidades: v.severidades(req.query.severidade),
        situacoes: v.situacoes(req.query.situacao),
        cnpj: v.cnpj(req.query.distribuidora),
        agrupar,
        pagina: v.inteiro(req.query.pagina, 'pagina', 1, 1, 10_000),
        tamanho: v.inteiro(req.query.tamanho, 'tamanho', 50, 1, 200),
      }),
    );
  };
}

export class ConjuntoController {
  constructor(private readonly service: ConjuntoService) {}

  detalhe = async (req: Request, res: Response): Promise<void> => {
    const id = v.idNumerico(req.params.id, 'id do conjunto');
    const comp = v.competencia(req.query.competencia);
    res.json(await this.service.detalhar(id, comp?.ano, comp?.mes));
  };
}
