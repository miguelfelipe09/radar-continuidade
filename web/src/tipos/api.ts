/** Tipos das entidades e dos DTOs de resposta.
 *
 * Os schemas do OpenAPI em docs/openapi.ts espelham estes tipos. Se
 * divergirem, a documentação mente.
 *
 * Todo indicador carrega o sufixo `_aprox`: são reconstruções a partir do
 * dado bruto da ANEEL, não os valores oficiais de DEC e FEC, que seguem
 * metodologia própria de expurgo e apuração.
 */

export interface Competencia {
  ano: number;
  mes: number;
  rotulo: string; // "2026-07"
}

export interface DistribuidoraResumo {
  sigla: string;
  /** 14 dígitos, com zero à esquerda: no banco é bigint e o perde. */
  cnpj: string;
}

export interface ConjuntoResumo {
  id: number;
  nome: string | null;
}

export type Severidade = 'alta' | 'moderada' | 'normal' | 'queda';

export type Situacao =
  | 'avaliado'
  | 'ausente'
  | 'conjunto_invalido'
  | 'destoante'
  | 'cobertura'
  | 'denominador'
  | 'sem_baseline';

export type MotivoAusencia =
  | 'distribuidora_ausente'
  | 'conjunto_encerrado'
  | 'conjunto_isolado';

export interface Baseline {
  mediana: number;
  iqr: number;
  pontos: number;
  /** q3 + 1,5 × IQR: acima disto é anomalia. */
  limite_alerta: number;
}

export interface ContextoItem {
  reconfiguracao: boolean;
  baseline_esburacado: boolean;
  buracos_envio: number;
  buracos_conjunto: number;
  saturacao_frota: number | null;
  /** Conjuntos avaliados da distribuidora nesta competência — o denominador
   *  da saturação. */
  frota_avaliada: number;
  /** Derivado: saturação acima do limiar **e** frota grande o bastante para
   *  a saturação significar algo. Uma distribuidora de um conjunto satura em
   *  100% com um único alerta. */
  evento_regional: boolean;
  /** Mais de 70% do consumidor-hora do mês vem dos 5 maiores eventos: o
   *  indicador está apoiado em meia dúzia de registros, que convém olhar
   *  antes de concluir algo sobre a rede. */
  concentrado: boolean;
}

export interface ItemFila {
  conjunto: ConjuntoResumo;
  distribuidora: DistribuidoraResumo;
  situacao: Situacao;
  severidade: Severidade | null;
  motivo_ausencia?: MotivoAusencia;
  observacao?: string;
  consumidores_afetados: number | null;
  consumidores_ativos: number | null;
  eventos: number | null;
  dec_aprox: number | null;
  dec_normalizado: number | null;
  baseline: Baseline | null;
  desvio_iqr: number | null;
  contexto: ContextoItem;
}

export interface GrupoFila {
  distribuidora: DistribuidoraResumo;
  alertas: number;
  saturacao_frota: number | null;
  evento_regional: boolean;
  itens: ItemFila[];
}

export interface RespostaFila {
  competencia: Competencia;
  total: number;
  pagina: number;
  tamanho: number;
  itens?: ItemFila[];
  grupos?: GrupoFila[];
}

export interface ItemRanking {
  posicao: number;
  distribuidora: DistribuidoraResumo;
  conjuntos: number;
  consumidores_ativos: number;
  dec_aprox: number;
  fec_aprox: number;
  ano_anterior: {
    dec_aprox: number | null;
    variacao_pct: number | null;
    conjuntos_comparaveis: number;
    sobreposicao: number;
    motivo?: 'sobreposicao_insuficiente';
  };
  alertas: { alta: number; moderada: number };
  saturacao_frota: number | null;
}

export interface RespostaRanking {
  competencia: Competencia;
  ordem: string;
  itens: ItemRanking[];
}

export interface RespostaBoletim {
  competencia: Competencia;
  carga: {
    run_id: number;
    status: string;
    finalizado_em: string | null;
    arquivo: string;
    linhas_processadas: number;
    linhas_inseridas: number;
    linhas_atualizadas: number;
    distribuidoras_ausentes: number;
  };
  cobertura: {
    conjuntos_considerados: number;
    avaliados: number;
    ausentes: number;
    sem_baseline: number;
    excluidos: Record<string, number>;
  };
  alertas: Record<string, number>;
  delta: {
    competencia_anterior: string | null;
    /** Total desta competência, ao lado da variação: sem ele o número não se
     *  lê sozinho. */
    alertas_atual: number;
    alertas_anterior: number | null;
    variacao_alertas: number | null;
    /** Rotatividade normal fica entre 62% e 95% do total — a fila se renova
     *  quase inteira todo mês, porque o alerta é sobre o desvio daquele mês.
     *  Não é manchete. */
    entraram_na_fila: number | null;
    sairam_da_fila: number | null;
    /** Subiram de moderada para alta em relação à competência anterior. */
    pioraram: Array<{
      conjunto: ConjuntoResumo;
      distribuidora: DistribuidoraResumo;
      de: Severidade;
      para: Severidade;
      consumidores_afetados: number;
    }>;
    /** Competências consecutivas exigidas para contar como reincidente. */
    reincidencia_meses: number;
    /** Quantas competências dessa janela têm detecção gravada. Menor que
     *  `reincidencia_meses` significa que não dá para saber quem é
     *  reincidente — diferente de não haver nenhum. */
    reincidencia_competencias_com_deteccao: number;
    /** Na fila em competências consecutivas — o que a fila sozinha não mostra. */
    reincidentes: Array<{
      conjunto: ConjuntoResumo;
      distribuidora: DistribuidoraResumo;
      severidade: Severidade;
      meses_seguidos: number;
      consumidores_afetados: number;
    }>;
  };
  destaques: {
    maior_saturacao: {
      distribuidora: DistribuidoraResumo;
      saturacao_frota: number;
      alertas: number;
      avaliados: number;
    } | null;
    distribuidoras_ausentes: Array<{
      distribuidora: DistribuidoraResumo;
      conjuntos: number;
      ultimo_envio: string | null;
    }>;
    topo_da_fila: ItemFila[];
  };
}

export interface PontoSerie {
  competencia: string;
  ano: number;
  mes: number;
  dec_aprox: number | null;
  fec_aprox: number | null;
  eventos: number;
  consumidores_afetados: number;
  destoante: boolean;
}

export interface CausaAgregada {
  causa: string | null;
  eventos: number;
  consumidores_afetados: number;
  consumidor_horas: number;
}

export interface AlimentadorAgregado {
  codigo: string;
  eventos: number;
  consumidores_afetados: number;
  consumidor_horas: number;
}

export interface RespostaConjunto {
  conjunto: ConjuntoResumo;
  distribuidora: DistribuidoraResumo;
  competencia: Competencia;
  resumo: ItemFila | null;
  serie: PontoSerie[];
  mesmo_mes_anos_anteriores: Array<{
    competencia: string;
    dec_aprox: number | null;
  }>;
  causas: CausaAgregada[];
  alimentadores: AlimentadorAgregado[];
  /** Falso antes de 2026: o código de alimentador do layout antigo não
   *  sobrevive à virada de layout (ACHADOS §2). */
  alimentadores_disponiveis: boolean;
}

export interface RespostaErro {
  erro: { codigo: string; mensagem: string };
}
