import { RespostaCompetencias } from '../models';
import { ContextoRepository } from '../repositories/contexto.repository';
import { competenciaDto } from './mapeadores';

export class CompetenciasService {
  constructor(private readonly contextoRepo: ContextoRepository) {}

  async listar(): Promise<RespostaCompetencias> {
    const linhas = await this.contextoRepo.competencias();
    return { competencias: linhas.map((c) => competenciaDto(c.ano, c.mes)) };
  }
}
