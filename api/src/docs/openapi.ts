/** Especificação OpenAPI 3, escrita à mão.
 *
 * Os schemas espelham os tipos de `models/`. Se divergirem, a documentação
 * mente — ao mexer num, mexa no outro.
 *
 * Os exemplos são respostas reais, copiadas de chamadas que rodaram contra a
 * base carregada (24.983.357 interrupções, competências de 2024 a 2026).
 */

import { exemplos } from './exemplos';

const competencia = {
  type: 'object',
  properties: {
    ano: { type: 'integer', example: 2026 },
    mes: { type: 'integer', example: 7 },
    rotulo: { type: 'string', example: '2026-07' },
  },
};

const distribuidora = {
  type: 'object',
  properties: {
    sigla: { type: 'string', example: 'LIGHT SESA' },
    cnpj: {
      type: 'string',
      description:
        'CNPJ com 14 dígitos. No banco é bigint e perde o zero à esquerda, ' +
        'que é reposto aqui.',
      example: '60444437000146',
    },
  },
};

const baseline = {
  type: 'object',
  nullable: true,
  description:
    'Referência histórica do próprio conjunto, dessazonalizada. Mediana e ' +
    'IQR, não média e desvio padrão: média e desvio são destruídos pelo ' +
    'próprio outlier que se quer detectar.',
  properties: {
    mediana: { type: 'number', example: 1.05 },
    iqr: {
      type: 'number',
      description: 'Distância entre o terceiro e o primeiro quartil.',
      example: 0.81,
    },
    pontos: {
      type: 'integer',
      description:
        'Competências usadas no baseline. Mínimo de 12 para o conjunto ser ' +
        'avaliado; abaixo disso a situação é sem_baseline.',
      example: 29,
    },
    limite_alerta: {
      type: 'number',
      description:
        'q3 + 1,5 × IQR. Acima disto o conjunto entra na fila; acima de ' +
        'q3 + 3 × IQR a severidade é alta.',
      example: 2.27,
    },
  },
};

const contexto = {
  type: 'object',
  description: 'Qualificadores que não mudam a classificação, mas mudam a leitura.',
  properties: {
    reconfiguracao: {
      type: 'boolean',
      description:
        'O conjunto foi redesenhado no período (consumidores migraram entre ' +
        'conjuntos). Mudança administrativa não é anomalia operacional: a ' +
        'interface deve mostrar nota, não alerta.',
    },
    baseline_esburacado: {
      type: 'boolean',
      description: 'Verdadeiro quando buracos_envio >= 1.',
    },
    buracos_envio: {
      type: 'integer',
      description:
        'Meses do histórico do conjunto em que a distribuidora dele falhou ' +
        'no envio — ausente ou com menos de 50% da frota típica. Ausência de ' +
        'envio não é ausência de interrupção, e o baseline fica mais frágil.',
      example: 0,
    },
    buracos_conjunto: {
      type: 'integer',
      description:
        'Meses em que a distribuidora enviou normalmente e só este conjunto ' +
        'não apareceu — provavelmente mês sem nenhuma interrupção.',
      example: 0,
    },
    saturacao_frota: {
      type: 'number',
      nullable: true,
      description:
        'Fração da frota avaliada da distribuidora que alertou nesta ' +
        'competência. Todo mês tem alguma distribuidora entre 0,14 e 0,33; ' +
        'em 2026-07 a LIGHT SESA chega a 0,83. Serve para distinguir ' +
        'conjunto com problema de distribuidora inteira com evento.',
      example: 0.8257,
    },
    evento_regional: {
      type: 'boolean',
      description:
        'Derivado na API: saturacao_frota >= 0,5. Não é armazenado, é regra ' +
        'de apresentação.',
    },
  },
};

const itemFila = {
  type: 'object',
  properties: {
    conjunto: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 16900 },
        nome: { type: 'string', nullable: true, example: 'PACIENCIA' },
      },
    },
    distribuidora,
    situacao: {
      type: 'string',
      enum: [
        'avaliado',
        'ausente',
        'conjunto_invalido',
        'destoante',
        'cobertura',
        'denominador',
        'sem_baseline',
      ],
      description: [
        'O que aconteceu com o conjunto nesta competência:',
        '- `avaliado`: comparado contra o baseline; veja severidade.',
        '- `ausente`: o conjunto reportava e não apareceu — veja motivo_ausencia.',
        '- `conjunto_invalido`: código de conjunto inválido (o conjunto 0, da COPEL-DIS, sem nome).',
        '- `destoante`: consumidores ativos do mês fogem 3x da mediana anual, então o denominador não é confiável.',
        '- `cobertura`: a competência, ou a distribuidora naquela competência, ficou abaixo de 50% da cobertura típica.',
        '- `denominador`: sem consumidores ativos ou abaixo de 100 — guarda contra denominador quebrado.',
        '- `sem_baseline`: menos de 12 competências de histórico. Melhor não avaliar que avaliar mal.',
      ].join('\n'),
    },
    severidade: {
      type: 'string',
      nullable: true,
      enum: ['alta', 'moderada', 'normal', 'queda'],
      description: [
        'Só preenchida quando situacao = avaliado.',
        '- `alta`: acima de q3 + 3 × IQR do próprio baseline.',
        '- `moderada`: acima de q3 + 1,5 × IQR.',
        '- `normal`: dentro da variação histórica.',
        '- `queda`: caiu a menos de um quarto da mediana. **Não é alerta** e fica fora da fila — pode ser rede melhorando ou distribuidora deixando de reportar, e a segunda hipótese interessa ao analista.',
      ].join('\n'),
    },
    motivo_ausencia: {
      type: 'string',
      nullable: true,
      enum: ['distribuidora_ausente', 'conjunto_encerrado', 'conjunto_isolado'],
      description: [
        'Ausência tem três leituras, e só a última é boa notícia:',
        '- `distribuidora_ausente`: a distribuidora inteira parou de enviar. Problema de fonte. Em 2026-07 são 45 conjuntos da CPFL-PIRATINING, sem envio desde 2026-03.',
        '- `conjunto_encerrado`: ausente há 3 competências ou mais, com a distribuidora enviando normalmente — o código de conjunto foi aposentado. Em 2026-07 são 85, todos das seis distribuidoras que renumeraram a frota na virada de 2026.',
        '- `conjunto_isolado`: faltou nesta competência e estava presente na anterior. Provavelmente mês sem nenhuma interrupção.',
        '',
        'O campo `observacao` traz a frase pronta, com a competência do último registro.',
      ].join('\n'),
    },
    observacao: { type: 'string', nullable: true },
    consumidores_afetados: {
      type: 'integer',
      nullable: true,
      description: 'Soma no mês. É o critério de ordenação da fila.',
    },
    consumidores_ativos: { type: 'integer', nullable: true },
    eventos: { type: 'integer', nullable: true },
    dec_aprox: {
      type: 'number',
      nullable: true,
      description:
        'DEC **aproximado**: consumidor-hora ÷ consumidores ativos, em horas ' +
        'por consumidor no mês. É reconstrução a partir do dado bruto, não o ' +
        'DEC oficial da ANEEL, que segue metodologia própria de expurgo e ' +
        'apuração.',
      example: 11.87,
    },
    dec_normalizado: {
      type: 'number',
      nullable: true,
      description:
        'dec_aprox dividido pelo índice sazonal do mês. É o valor comparado ' +
        'contra o baseline. A sazonalidade é forte — o DEC mediano vai de ' +
        '1,59 em janeiro a 0,72 em junho — e sem descontá-la a comparação ' +
        'acusaria a estação, não a rede.',
      example: 17.27,
    },
    baseline,
    desvio_iqr: {
      type: 'number',
      nullable: true,
      description: '(observado − mediana) ÷ IQR, em número de IQRs.',
      example: 20.1,
    },
    contexto,
  },
};

const erro = {
  type: 'object',
  properties: {
    erro: {
      type: 'object',
      properties: {
        codigo: { type: 'string', example: 'requisicao_invalida' },
        mensagem: { type: 'string' },
      },
    },
  },
};

const respostasErro = {
  400: {
    description: 'Parâmetro inválido.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Erro' },
        example: {
          erro: {
            codigo: 'requisicao_invalida',
            mensagem:
              'competência inválida: "2026-13". Formato esperado AAAA-MM, por exemplo 2026-07.',
          },
        },
      },
    },
  },
  404: {
    description: 'Recurso inexistente.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Erro' },
        example: {
          erro: { codigo: 'nao_encontrado', mensagem: 'Conjunto 99999 não existe.' },
        },
      },
    },
  },
  500: {
    description: 'Erro interno.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
  },
};

const paramCompetencia = {
  name: 'competencia',
  in: 'query',
  required: false,
  schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
  example: '2026-07',
  description:
    'Competência no formato AAAA-MM. O eixo temporal do projeto é a ' +
    'competência declarada, não a data de início da interrupção. Omitido, ' +
    'usa a competência mais recente detectada.',
};

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Radar de Continuidade — API',
    version: '1.0.0',
    description: [
      'Fila de investigação sobre os dados públicos de interrupções da ANEEL.',
      '',
      'A cada carga, o sistema identifica quais **conjuntos elétricos** fugiram',
      'do próprio comportamento histórico, priorizados por consumidores',
      'afetados.',
      '',
      '> **Os indicadores são aproximações.** `dec_aprox` e `fec_aprox` são',
      '> reconstruídos a partir do dado bruto e não são os valores oficiais de',
      '> DEC e FEC apurados pela ANEEL, que seguem metodologia própria de',
      '> expurgo e apuração. O sufixo `_aprox` está em todos eles por isso.',
      '',
      'Base carregada: 24.983.357 interrupções de 2024 a 2026, 3.262 conjuntos,',
      '52 distribuidoras.',
    ].join('\n'),
  },
  servers: [{ url: '/api/v1', description: 'Base da API' }],
  tags: [
    { name: 'Boletim', description: 'O que mudou na última carga' },
    { name: 'Ranking', description: 'Distribuidoras por indicador' },
    { name: 'Fila', description: 'Conjuntos a investigar' },
    { name: 'Conjuntos', description: 'Detalhe de um conjunto' },
  ],
  paths: {
    '/boletim': {
      get: {
        tags: ['Boletim'],
        summary: 'Boletim da carga',
        description:
          'Estado da última execução do pipeline e o que mudou desde a ' +
          'competência anterior: quantos alertas a mais ou a menos, quais ' +
          'conjuntos entraram na fila, quais distribuidoras pararam de enviar.',
        parameters: [paramCompetencia],
        responses: {
          200: {
            description: 'Boletim da competência.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Boletim' },
                example: exemplos.boletim,
              },
            },
          },
          ...respostasErro,
        },
      },
    },
    '/ranking': {
      get: {
        tags: ['Ranking'],
        summary: 'Ranking das piores distribuidoras',
        description: [
          'Distribuidoras ordenadas do **pior para o melhor** indicador:',
          'posição 1 é a de pior continuidade, não a melhor.',
          '',
          'O indicador da distribuidora é a **mediana** dos conjuntos dela, não',
          'a média, pelo mesmo motivo do baseline.',
          '',
          'A comparação com o ano anterior é **pareada**: entram apenas os',
          'conjuntos presentes nas duas competências. A frota muda entre anos —',
          'a DMED trocou os quatro códigos de conjunto na virada de 2026 — e',
          'comparar medianas de frotas diferentes produz variação inventada.',
          'Por isso `sobreposicao` vem sempre junto, e abaixo de 0,5 a variação',
          'vai nula com `motivo`.',
        ].join('\n'),
        parameters: [
          paramCompetencia,
          {
            name: 'ordem',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['dec_aprox', 'fec_aprox', 'variacao'],
              default: 'dec_aprox',
            },
            description:
              'Critério de ordenação, sempre do pior para o melhor. ' +
              '`variacao` ordena pela piora contra o mesmo mês do ano anterior.',
          },
          {
            name: 'limite',
            in: 'query',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Ranking da competência.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Ranking' },
                example: exemplos.ranking,
              },
            },
          },
          ...respostasErro,
        },
      },
    },
    '/fila': {
      get: {
        tags: ['Fila'],
        summary: 'Fila de investigação',
        description: [
          'Conjuntos da competência, ordenados por **consumidores afetados** e',
          'não pelo desvio estatístico: um conjunto de 200 consumidores com',
          'desvio enorme importa menos que um de 80 mil com desvio moderado.',
          '',
          'Ausência é informação: conjuntos que reportavam e sumiram aparecem',
          'com `situacao = ausente` e `motivo_ausencia`, no fim da lista. Em',
          '2026-07 são 45 conjuntos da CPFL-PIRATINING, que não envia desde',
          '2026-03.',
          '',
          'Quando um evento satura a frota de uma distribuidora, use',
          '`agrupar=distribuidora` para a lista não virar 90 linhas seguidas',
          'da mesma empresa.',
        ].join('\n'),
        parameters: [
          paramCompetencia,
          {
            name: 'severidade',
            in: 'query',
            schema: { type: 'string' },
            example: 'alta,moderada',
            description: 'Lista separada por vírgula: alta, moderada, normal, queda.',
          },
          {
            name: 'situacao',
            in: 'query',
            schema: { type: 'string' },
            example: 'avaliado,ausente',
            description: 'Lista separada por vírgula. Veja o enum de situacao.',
          },
          {
            name: 'distribuidora',
            in: 'query',
            schema: { type: 'string' },
            example: '60444437000146',
            description: 'CNPJ, com ou sem máscara.',
          },
          {
            name: 'agrupar',
            in: 'query',
            schema: { type: 'string', enum: ['nenhum', 'distribuidora'], default: 'nenhum' },
          },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          {
            name: 'tamanho',
            in: 'query',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
          },
        ],
        responses: {
          200: {
            description: 'Página da fila.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Fila' },
                examples: {
                  alertas: {
                    summary: 'Conjuntos com desvio (severidade alta e moderada)',
                    value: exemplos.fila,
                  },
                  ausentes: {
                    summary: 'Ausência de dado — falta de envio, não falta de problema',
                    description:
                      'Os dois motivos de ausência lado a lado. A observação diz ' +
                      'desde quando, para o item não ser lido como "conjunto sem ' +
                      'problemas".',
                    value: exemplos.filaAusentes,
                  },
                },
              },
            },
          },
          ...respostasErro,
        },
      },
    },
    '/conjuntos/{id}': {
      get: {
        tags: ['Conjuntos'],
        summary: 'Detalhe do conjunto',
        description: [
          'Série histórica completa, comparação com o mesmo mês dos anos',
          'anteriores, causas e alimentadores da competência.',
          '',
          '`alimentadores_disponiveis` é falso antes de 2026: metade dos códigos',
          'de alimentador não sobrevive à mudança de layout da base, então o',
          'drill-down por alimentador só vale para o layout novo.',
          '',
          'Causas vêm como texto bruto, sem normalização: o layout antigo tem',
          '705 grafias distintas para a mesma taxonomia.',
        ].join('\n'),
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 16900,
          },
          paramCompetencia,
        ],
        responses: {
          200: {
            description: 'Detalhe do conjunto.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Conjunto' },
                example: exemplos.conjunto,
              },
            },
          },
          ...respostasErro,
        },
      },
    },
  },
  components: {
    schemas: {
      Erro: erro,
      Competencia: competencia,
      Distribuidora: distribuidora,
      ItemFila: itemFila,
      Fila: {
        type: 'object',
        properties: {
          competencia,
          total: { type: 'integer', description: 'Total de itens no filtro.' },
          pagina: { type: 'integer' },
          tamanho: { type: 'integer' },
          itens: {
            type: 'array',
            items: { $ref: '#/components/schemas/ItemFila' },
            description: 'Presente quando agrupar = nenhum.',
          },
          grupos: {
            type: 'array',
            description: 'Presente quando agrupar = distribuidora.',
            items: {
              type: 'object',
              properties: {
                distribuidora,
                alertas: { type: 'integer' },
                saturacao_frota: { type: 'number', nullable: true },
                evento_regional: { type: 'boolean' },
                itens: { type: 'array', items: { $ref: '#/components/schemas/ItemFila' } },
              },
            },
          },
        },
      },
      Ranking: {
        type: 'object',
        properties: {
          competencia,
          ordem: { type: 'string' },
          itens: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                posicao: {
                  type: 'integer',
                  description: 'Posição no ranking dos piores: 1 é o pior.',
                },
                distribuidora,
                conjuntos: { type: 'integer' },
                consumidores_ativos: { type: 'integer' },
                dec_aprox: {
                  type: 'number',
                  description: 'Mediana do DEC aproximado dos conjuntos da distribuidora.',
                },
                fec_aprox: {
                  type: 'number',
                  description: 'Mediana do FEC aproximado: afetados ÷ ativos, por mês.',
                },
                ano_anterior: {
                  type: 'object',
                  properties: {
                    dec_aprox: { type: 'number', nullable: true },
                    variacao_pct: {
                      type: 'number',
                      nullable: true,
                      description:
                        'Variação percentual contra o mesmo mês do ano ' +
                        'anterior, calculada só sobre os conjuntos comuns. ' +
                        'Nula quando a sobreposição fica abaixo de 0,5.',
                    },
                    conjuntos_comparaveis: { type: 'integer' },
                    sobreposicao: {
                      type: 'number',
                      description:
                        'Fração da frota atual que também existia no ano ' +
                        'anterior. Entre 0,5 e 0,95 o número existe mas ' +
                        'merece ressalva na interface.',
                    },
                    motivo: { type: 'string', nullable: true },
                  },
                },
                alertas: {
                  type: 'object',
                  properties: {
                    alta: { type: 'integer' },
                    moderada: { type: 'integer' },
                  },
                },
                saturacao_frota: { type: 'number', nullable: true },
              },
            },
          },
        },
      },
      Boletim: {
        type: 'object',
        properties: {
          competencia,
          carga: {
            type: 'object',
            description: 'Execução do ETL que produziu estes números.',
            properties: {
              run_id: { type: 'integer' },
              status: { type: 'string', enum: ['em_execucao', 'sucesso', 'falha'] },
              finalizado_em: { type: 'string', format: 'date-time', nullable: true },
              arquivo: { type: 'string' },
              linhas_processadas: { type: 'integer' },
              linhas_inseridas: { type: 'integer' },
              linhas_atualizadas: {
                type: 'integer',
                description:
                  'Linhas que já existiam e mudaram de valor. A ANEEL ' +
                  'republica o arquivo do ano a cada mês, com retificações.',
              },
              distribuidoras_ausentes: { type: 'integer' },
            },
          },
          cobertura: {
            type: 'object',
            properties: {
              conjuntos_considerados: { type: 'integer' },
              avaliados: { type: 'integer' },
              ausentes: { type: 'integer' },
              sem_baseline: { type: 'integer' },
              excluidos: { type: 'object', additionalProperties: { type: 'integer' } },
            },
          },
          alertas: { type: 'object', additionalProperties: { type: 'integer' } },
          delta: {
            type: 'object',
            description: 'Comparação com a competência anterior da mesma execução.',
            properties: {
              competencia_anterior: { type: 'string', nullable: true },
              alertas_atual: {
                type: 'integer',
                description: 'Total de alta + moderada nesta competência.',
              },
              alertas_anterior: { type: 'integer', nullable: true },
              variacao_alertas: {
                type: 'integer',
                nullable: true,
                description: 'alertas_atual − alertas_anterior.',
              },
              entraram_na_fila: {
                type: 'integer',
                nullable: true,
                description: [
                  'Conjuntos que alertam agora e não alertavam na competência',
                  'anterior.',
                  '',
                  '**Não use como manchete.** A rotatividade normal da fila fica',
                  'entre 62% e 95% do total, medido nas competências de 2026-03 a',
                  '2026-07: a fila se renova quase inteira todo mês, porque o',
                  'alerta é sobre o desvio daquele mês, não sobre um estado que',
                  'persiste. Para destaque, use `pioraram` e `reincidentes`.',
                ].join('\n'),
              },
              sairam_da_fila: { type: 'integer', nullable: true },
              pioraram: {
                type: 'array',
                description:
                  'Conjuntos que subiram de moderada para alta em relação à ' +
                  'competência anterior. Os 5 maiores por consumidores afetados.',
                items: { type: 'object' },
              },
              reincidentes: {
                type: 'array',
                description:
                  'Conjuntos que alertam em 3 competências seguidas. É a ' +
                  'informação que a comparação entre execuções revela e a fila ' +
                  'sozinha não mostra: em 2026-07 são 8 conjuntos, contra 57 ' +
                  'que alertam em 2 dos últimos 3 meses.',
                items: { type: 'object' },
              },
            },
          },
          destaques: {
            type: 'object',
            properties: {
              maior_saturacao: { type: 'object', nullable: true },
              distribuidoras_ausentes: { type: 'array', items: { type: 'object' } },
              topo_da_fila: {
                type: 'array',
                items: { $ref: '#/components/schemas/ItemFila' },
              },
            },
          },
        },
      },
      Conjunto: {
        type: 'object',
        properties: {
          conjunto: { type: 'object' },
          distribuidora,
          competencia,
          resumo: { $ref: '#/components/schemas/ItemFila' },
          serie: {
            type: 'array',
            description: 'Série mensal completa do conjunto.',
            items: {
              type: 'object',
              properties: {
                competencia: { type: 'string' },
                ano: { type: 'integer' },
                mes: { type: 'integer' },
                dec_aprox: { type: 'number', nullable: true },
                fec_aprox: { type: 'number', nullable: true },
                eventos: { type: 'integer' },
                consumidores_afetados: { type: 'integer' },
                destoante: {
                  type: 'boolean',
                  description:
                    'Denominador do mês fora de padrão: o indicador fica nulo.',
                },
              },
            },
          },
          mesmo_mes_anos_anteriores: { type: 'array', items: { type: 'object' } },
          causas: { type: 'array', items: { type: 'object' } },
          alimentadores: { type: 'array', items: { type: 'object' } },
          alimentadores_disponiveis: { type: 'boolean' },
        },
      },
    },
  },
};
