/** Exemplos de resposta do Swagger.
 *
 * Gerado por scripts/capturar-exemplos.mjs a partir de chamadas reais contra
 * a base carregada. Não editar à mão: número de documentação que não veio de
 * uma chamada que rodou é número que alguém vai acreditar.
 *
 * Chamadas usadas:
 *   competencias: /api/v1/competencias
 *   boletim: /api/v1/boletim
 *   ranking: /api/v1/ranking?limite=3
 *   fila: /api/v1/fila?severidade=alta,moderada&tamanho=2
 *   filaAusentes: /api/v1/fila?situacao=ausente&tamanho=2
 *   conjunto: /api/v1/conjuntos/16900
 */

export const exemplos: Record<string, unknown> = {
  "competencias": {
    "competencias": [
      {
        "ano": 2026,
        "mes": 7,
        "rotulo": "2026-07"
      },
      {
        "ano": 2026,
        "mes": 6,
        "rotulo": "2026-06"
      },
      {
        "ano": 2026,
        "mes": 5,
        "rotulo": "2026-05"
      },
      {
        "ano": 2026,
        "mes": 4,
        "rotulo": "2026-04"
      },
      {
        "ano": 2026,
        "mes": 3,
        "rotulo": "2026-03"
      },
      {
        "ano": 2026,
        "mes": 2,
        "rotulo": "2026-02"
      },
      {
        "ano": 2026,
        "mes": 1,
        "rotulo": "2026-01"
      }
    ]
  },
  "boletim": {
    "competencia": {
      "ano": 2026,
      "mes": 7,
      "rotulo": "2026-07"
    },
    "carga": {
      "run_id": 5,
      "status": "sucesso",
      "finalizado_em": "2026-09-21T02:52:04.973Z",
      "arquivo": "interrupcoes-energia-eletrica-2026.parquet",
      "linhas_processadas": 6078331,
      "linhas_inseridas": 0,
      "linhas_atualizadas": 0,
      "distribuidoras_ausentes": 2
    },
    "cobertura": {
      "conjuntos_considerados": 3206,
      "avaliados": 2962,
      "ausentes": 131,
      "sem_baseline": 112,
      "excluidos": {
        "conjunto_invalido": 1,
        "destoante": 0,
        "cobertura": 0,
        "denominador": 0
      }
    },
    "alertas": {
      "alta": 199,
      "moderada": 159,
      "normal": 2564,
      "queda": 40
    },
    "delta": {
      "competencia_anterior": "2026-06",
      "alertas_atual": 358,
      "alertas_anterior": 195,
      "variacao_alertas": 163,
      "entraram_na_fila": 324,
      "sairam_da_fila": 161,
      "pioraram": [
        {
          "conjunto": {
            "id": 16524,
            "nome": "Caxias do Sul 5"
          },
          "distribuidora": {
            "sigla": "RGE SUL",
            "cnpj": "02016440000162"
          },
          "de": "moderada",
          "para": "alta",
          "consumidores_afetados": 73991
        },
        {
          "conjunto": {
            "id": 13969,
            "nome": "Ribeirão Preto 5-Ipiranga"
          },
          "distribuidora": {
            "sigla": "CPFL-PAULISTA",
            "cnpj": "33050196000188"
          },
          "de": "moderada",
          "para": "alta",
          "consumidores_afetados": 56614
        },
        {
          "conjunto": {
            "id": 15063,
            "nome": "BAEPENDI SUBTERRANEO"
          },
          "distribuidora": {
            "sigla": "LIGHT SESA",
            "cnpj": "60444437000146"
          },
          "de": "moderada",
          "para": "alta",
          "consumidores_afetados": 53411
        },
        {
          "conjunto": {
            "id": 15059,
            "nome": "HUMAITA SUBTERRANEO"
          },
          "distribuidora": {
            "sigla": "LIGHT SESA",
            "cnpj": "60444437000146"
          },
          "de": "moderada",
          "para": "alta",
          "consumidores_afetados": 26517
        },
        {
          "conjunto": {
            "id": 15047,
            "nome": "CAMPO MARTE AEREO"
          },
          "distribuidora": {
            "sigla": "LIGHT SESA",
            "cnpj": "60444437000146"
          },
          "de": "moderada",
          "para": "alta",
          "consumidores_afetados": 22036
        }
      ],
      "reincidencia_meses": 3,
      "reincidencia_competencias_com_deteccao": 3,
      "reincidentes": [
        {
          "conjunto": {
            "id": 15886,
            "nome": "ABAETETUBA II"
          },
          "distribuidora": {
            "sigla": "EQUATORIAL PA",
            "cnpj": "04895728000180"
          },
          "severidade": "moderada",
          "meses_seguidos": 3,
          "consumidores_afetados": 178374
        },
        {
          "conjunto": {
            "id": 15468,
            "nome": "COQUEIRO"
          },
          "distribuidora": {
            "sigla": "EQUATORIAL PA",
            "cnpj": "04895728000180"
          },
          "severidade": "moderada",
          "meses_seguidos": 3,
          "consumidores_afetados": 157879
        },
        {
          "conjunto": {
            "id": 15898,
            "nome": "PARADA DO BENTO"
          },
          "distribuidora": {
            "sigla": "EQUATORIAL PA",
            "cnpj": "04895728000180"
          },
          "severidade": "moderada",
          "meses_seguidos": 3,
          "consumidores_afetados": 43238
        },
        {
          "conjunto": {
            "id": 16990,
            "nome": "Maruim"
          },
          "distribuidora": {
            "sigla": "ENERGIPE",
            "cnpj": "13017462000163"
          },
          "severidade": "moderada",
          "meses_seguidos": 3,
          "consumidores_afetados": 17657
        },
        {
          "conjunto": {
            "id": 16762,
            "nome": "HAUER"
          },
          "distribuidora": {
            "sigla": "COPEL-DIS",
            "cnpj": "04368898000106"
          },
          "severidade": "alta",
          "meses_seguidos": 3,
          "consumidores_afetados": 17374
        }
      ]
    },
    "destaques": {
      "maior_saturacao": {
        "distribuidora": {
          "sigla": "LIGHT SESA",
          "cnpj": "60444437000146"
        },
        "saturacao_frota": 0.8257,
        "alertas": 90,
        "avaliados": 109
      },
      "distribuidoras_ausentes": [
        {
          "distribuidora": {
            "sigla": "CPFL-PIRATINING",
            "cnpj": "04172213000151"
          },
          "conjuntos": 45,
          "ultimo_envio": "2026-03"
        },
        {
          "distribuidora": {
            "sigla": "CERTHIL",
            "cnpj": "98042963000152"
          },
          "conjuntos": 1,
          "ultimo_envio": "2025-12"
        }
      ],
      "topo_da_fila": [
        {
          "conjunto": {
            "id": 13317,
            "nome": "JUREMA"
          },
          "distribuidora": {
            "sigla": "ENEL CE",
            "cnpj": "07047251000170"
          },
          "situacao": "avaliado",
          "severidade": "moderada",
          "consumidores_afetados": 279285,
          "consumidores_ativos": 98430,
          "eventos": 729,
          "dec_aprox": 1.62,
          "dec_normalizado": 2.35,
          "baseline": {
            "mediana": 0.74,
            "iqr": 0.63,
            "pontos": 30,
            "limite_alerta": 1.97
          },
          "desvio_iqr": 2.5,
          "contexto": {
            "reconfiguracao": false,
            "baseline_esburacado": false,
            "buracos_envio": 0,
            "buracos_conjunto": 0,
            "saturacao_frota": 0.113,
            "frota_avaliada": 115,
            "evento_regional": false,
            "concentrado": false
          }
        },
        {
          "conjunto": {
            "id": 13060,
            "nome": "Muriqui"
          },
          "distribuidora": {
            "sigla": "ENEL RJ",
            "cnpj": "33050071000158"
          },
          "situacao": "avaliado",
          "severidade": "alta",
          "consumidores_afetados": 269077,
          "consumidores_ativos": 35452,
          "eventos": 1043,
          "dec_aprox": 16.76,
          "dec_normalizado": 24.39,
          "baseline": {
            "mediana": 3.55,
            "iqr": 2.21,
            "pontos": 29,
            "limite_alerta": 8.05
          },
          "desvio_iqr": 9.4,
          "contexto": {
            "reconfiguracao": false,
            "baseline_esburacado": true,
            "buracos_envio": 1,
            "buracos_conjunto": 0,
            "saturacao_frota": 0.5,
            "frota_avaliada": 78,
            "evento_regional": true,
            "concentrado": false
          }
        },
        {
          "conjunto": {
            "id": 16900,
            "nome": "PACIENCIA"
          },
          "distribuidora": {
            "sigla": "LIGHT SESA",
            "cnpj": "60444437000146"
          },
          "situacao": "avaliado",
          "severidade": "alta",
          "consumidores_afetados": 253948,
          "consumidores_ativos": 66595,
          "eventos": 1237,
          "dec_aprox": 11.87,
          "dec_normalizado": 17.27,
          "baseline": {
            "mediana": 1.05,
            "iqr": 0.81,
            "pontos": 29,
            "limite_alerta": 2.86
          },
          "desvio_iqr": 20.1,
          "contexto": {
            "reconfiguracao": false,
            "baseline_esburacado": true,
            "buracos_envio": 1,
            "buracos_conjunto": 0,
            "saturacao_frota": 0.8257,
            "frota_avaliada": 109,
            "evento_regional": true,
            "concentrado": false
          }
        }
      ]
    }
  },
  "ranking": {
    "competencia": {
      "ano": 2026,
      "mes": 7,
      "rotulo": "2026-07"
    },
    "ordem": "dec_aprox",
    "itens": [
      {
        "posicao": 1,
        "distribuidora": {
          "sigla": "LIGHT SESA",
          "cnpj": "60444437000146"
        },
        "conjuntos": 109,
        "consumidores_ativos": 3931623,
        "dec_aprox": 3.83,
        "fec_aprox": 1.01,
        "ano_anterior": {
          "dec_aprox": 0.56,
          "variacao_pct": 588.4,
          "conjuntos_comparaveis": 109,
          "sobreposicao": 1
        },
        "alertas": {
          "alta": 83,
          "moderada": 7
        },
        "saturacao_frota": 0.8257
      },
      {
        "posicao": 2,
        "distribuidora": {
          "sigla": "CEA",
          "cnpj": "05965546000109"
        },
        "conjuntos": 12,
        "consumidores_ativos": 273464,
        "dec_aprox": 3.64,
        "fec_aprox": 2.08,
        "ano_anterior": {
          "dec_aprox": 4.25,
          "variacao_pct": -14.3,
          "conjuntos_comparaveis": 12,
          "sobreposicao": 1
        },
        "alertas": {
          "alta": 0,
          "moderada": 1
        },
        "saturacao_frota": 0.0833
      },
      {
        "posicao": 3,
        "distribuidora": {
          "sigla": "ENEL RJ",
          "cnpj": "33050071000158"
        },
        "conjuntos": 78,
        "consumidores_ativos": 2700661,
        "dec_aprox": 2.44,
        "fec_aprox": 0.68,
        "ano_anterior": {
          "dec_aprox": 1.25,
          "variacao_pct": 95.1,
          "conjuntos_comparaveis": 78,
          "sobreposicao": 1
        },
        "alertas": {
          "alta": 28,
          "moderada": 11
        },
        "saturacao_frota": 0.5
      }
    ]
  },
  "fila": {
    "competencia": {
      "ano": 2026,
      "mes": 7,
      "rotulo": "2026-07"
    },
    "total": 358,
    "pagina": 1,
    "tamanho": 2,
    "itens": [
      {
        "conjunto": {
          "id": 13317,
          "nome": "JUREMA"
        },
        "distribuidora": {
          "sigla": "ENEL CE",
          "cnpj": "07047251000170"
        },
        "situacao": "avaliado",
        "severidade": "moderada",
        "consumidores_afetados": 279285,
        "consumidores_ativos": 98430,
        "eventos": 729,
        "dec_aprox": 1.62,
        "dec_normalizado": 2.35,
        "baseline": {
          "mediana": 0.74,
          "iqr": 0.63,
          "pontos": 30,
          "limite_alerta": 1.97
        },
        "desvio_iqr": 2.5,
        "contexto": {
          "reconfiguracao": false,
          "baseline_esburacado": false,
          "buracos_envio": 0,
          "buracos_conjunto": 0,
          "saturacao_frota": 0.113,
          "frota_avaliada": 115,
          "evento_regional": false,
          "concentrado": false
        }
      },
      {
        "conjunto": {
          "id": 13060,
          "nome": "Muriqui"
        },
        "distribuidora": {
          "sigla": "ENEL RJ",
          "cnpj": "33050071000158"
        },
        "situacao": "avaliado",
        "severidade": "alta",
        "consumidores_afetados": 269077,
        "consumidores_ativos": 35452,
        "eventos": 1043,
        "dec_aprox": 16.76,
        "dec_normalizado": 24.39,
        "baseline": {
          "mediana": 3.55,
          "iqr": 2.21,
          "pontos": 29,
          "limite_alerta": 8.05
        },
        "desvio_iqr": 9.4,
        "contexto": {
          "reconfiguracao": false,
          "baseline_esburacado": true,
          "buracos_envio": 1,
          "buracos_conjunto": 0,
          "saturacao_frota": 0.5,
          "frota_avaliada": 78,
          "evento_regional": true,
          "concentrado": false
        }
      }
    ]
  },
  "filaAusentes": {
    "competencia": {
      "ano": 2026,
      "mes": 7,
      "rotulo": "2026-07"
    },
    "total": 131,
    "pagina": 1,
    "tamanho": 2,
    "itens": [
      {
        "conjunto": {
          "id": 12777,
          "nome": "INTERLIGAÇÃO"
        },
        "distribuidora": {
          "sigla": "DMED",
          "cnpj": "23664303000104"
        },
        "situacao": "ausente",
        "severidade": null,
        "consumidores_afetados": null,
        "consumidores_ativos": null,
        "eventos": null,
        "dec_aprox": null,
        "dec_normalizado": null,
        "baseline": {
          "mediana": 0.23,
          "iqr": 0.18,
          "pontos": 24,
          "limite_alerta": 0.59
        },
        "desvio_iqr": null,
        "contexto": {
          "reconfiguracao": false,
          "baseline_esburacado": false,
          "buracos_envio": 0,
          "buracos_conjunto": 6,
          "saturacao_frota": null,
          "frota_avaliada": 0,
          "evento_regional": false,
          "concentrado": false
        },
        "motivo_ausencia": "conjunto_encerrado",
        "observacao": "Sem registros desde dez/2025. O código de conjunto provavelmente foi aposentado."
      },
      {
        "conjunto": {
          "id": 12780,
          "nome": "SATURNINO"
        },
        "distribuidora": {
          "sigla": "DMED",
          "cnpj": "23664303000104"
        },
        "situacao": "ausente",
        "severidade": null,
        "consumidores_afetados": null,
        "consumidores_ativos": null,
        "eventos": null,
        "dec_aprox": null,
        "dec_normalizado": null,
        "baseline": {
          "mediana": 0.33,
          "iqr": 0.21,
          "pontos": 24,
          "limite_alerta": 0.73
        },
        "desvio_iqr": null,
        "contexto": {
          "reconfiguracao": false,
          "baseline_esburacado": false,
          "buracos_envio": 0,
          "buracos_conjunto": 6,
          "saturacao_frota": null,
          "frota_avaliada": 0,
          "evento_regional": false,
          "concentrado": false
        },
        "motivo_ausencia": "conjunto_encerrado",
        "observacao": "Sem registros desde dez/2025. O código de conjunto provavelmente foi aposentado."
      }
    ]
  },
  "conjunto": {
    "conjunto": {
      "id": 16900,
      "nome": "PACIENCIA"
    },
    "distribuidora": {
      "sigla": "LIGHT SESA",
      "cnpj": "60444437000146"
    },
    "competencia": {
      "ano": 2026,
      "mes": 7,
      "rotulo": "2026-07"
    },
    "resumo": {
      "conjunto": {
        "id": 16900,
        "nome": "PACIENCIA"
      },
      "distribuidora": {
        "sigla": "LIGHT SESA",
        "cnpj": "60444437000146"
      },
      "situacao": "avaliado",
      "severidade": "alta",
      "consumidores_afetados": 253948,
      "consumidores_ativos": 66595,
      "eventos": 1237,
      "dec_aprox": 11.87,
      "dec_normalizado": 17.27,
      "baseline": {
        "mediana": 1.05,
        "iqr": 0.81,
        "pontos": 29,
        "limite_alerta": 2.86
      },
      "desvio_iqr": 20.1,
      "contexto": {
        "reconfiguracao": false,
        "baseline_esburacado": true,
        "buracos_envio": 1,
        "buracos_conjunto": 0,
        "saturacao_frota": 0.8257,
        "frota_avaliada": 109,
        "evento_regional": true,
        "concentrado": false
      }
    },
    "serie": [
      {
        "competencia": "2024-01",
        "ano": 2024,
        "mes": 1,
        "dec_aprox": 4.84,
        "fec_aprox": 1.43,
        "eventos": 1824,
        "consumidores_afetados": 86227,
        "destoante": false,
        "baseline_mediana": 1.65,
        "baseline_limite_alerta": 4.51
      },
      {
        "competencia": "2024-02",
        "ano": 2024,
        "mes": 2,
        "dec_aprox": 1.85,
        "fec_aprox": 0.59,
        "eventos": 1078,
        "consumidores_afetados": 35726,
        "destoante": false,
        "baseline_mediana": 1.35,
        "baseline_limite_alerta": 3.68
      },
      {
        "competencia": "2024-03",
        "ano": 2024,
        "mes": 3,
        "dec_aprox": 3.17,
        "fec_aprox": 0.95,
        "eventos": 963,
        "consumidores_afetados": 56956,
        "destoante": false,
        "baseline_mediana": 1.23,
        "baseline_limite_alerta": 3.37
      },
      {
        "competencia": "2024-04",
        "ano": 2024,
        "mes": 4,
        "dec_aprox": 0.68,
        "fec_aprox": 0.19,
        "eventos": 477,
        "consumidores_afetados": 11172,
        "destoante": false,
        "baseline_mediana": 0.95,
        "baseline_limite_alerta": 2.59
      },
      {
        "competencia": "2024-05",
        "ano": 2024,
        "mes": 5,
        "dec_aprox": 1.1,
        "fec_aprox": 0.4,
        "eventos": 738,
        "consumidores_afetados": 23733,
        "destoante": false,
        "baseline_mediana": 0.84,
        "baseline_limite_alerta": 2.3
      },
      {
        "competencia": "2024-06",
        "ano": 2024,
        "mes": 6,
        "dec_aprox": 0.49,
        "fec_aprox": 0.26,
        "eventos": 470,
        "consumidores_afetados": 15790,
        "destoante": false,
        "baseline_mediana": 0.75,
        "baseline_limite_alerta": 2.04
      },
      {
        "competencia": "2024-07",
        "ano": 2024,
        "mes": 7,
        "dec_aprox": 0.42,
        "fec_aprox": 0.2,
        "eventos": 429,
        "consumidores_afetados": 12255,
        "destoante": false,
        "baseline_mediana": 0.72,
        "baseline_limite_alerta": 1.97
      },
      {
        "competencia": "2024-08",
        "ano": 2024,
        "mes": 8,
        "dec_aprox": 2.31,
        "fec_aprox": 0.8,
        "eventos": 739,
        "consumidores_afetados": 49910,
        "destoante": false,
        "baseline_mediana": 0.77,
        "baseline_limite_alerta": 2.12
      },
      {
        "competencia": "2024-09",
        "ano": 2024,
        "mes": 9,
        "dec_aprox": 0.92,
        "fec_aprox": 0.44,
        "eventos": 728,
        "consumidores_afetados": 27765,
        "destoante": false,
        "baseline_mediana": 1.03,
        "baseline_limite_alerta": 2.81
      },
      {
        "competencia": "2024-10",
        "ano": 2024,
        "mes": 10,
        "dec_aprox": 1.44,
        "fec_aprox": 0.58,
        "eventos": 885,
        "consumidores_afetados": 36619,
        "destoante": false,
        "baseline_mediana": 1.31,
        "baseline_limite_alerta": 3.58
      },
      {
        "competencia": "2024-11",
        "ano": 2024,
        "mes": 11,
        "dec_aprox": 1.57,
        "fec_aprox": 0.83,
        "eventos": 753,
        "consumidores_afetados": 51866,
        "destoante": false,
        "baseline_mediana": 1.08,
        "baseline_limite_alerta": 2.94
      },
      {
        "competencia": "2024-12",
        "ano": 2024,
        "mes": 12,
        "dec_aprox": 1.36,
        "fec_aprox": 0.67,
        "eventos": 849,
        "consumidores_afetados": 41607,
        "destoante": false,
        "baseline_mediana": 1.52,
        "baseline_limite_alerta": 4.16
      },
      {
        "competencia": "2025-01",
        "ano": 2025,
        "mes": 1,
        "dec_aprox": 2.9,
        "fec_aprox": 0.85,
        "eventos": 1198,
        "consumidores_afetados": 53198,
        "destoante": false,
        "baseline_mediana": 1.65,
        "baseline_limite_alerta": 4.51
      },
      {
        "competencia": "2025-02",
        "ano": 2025,
        "mes": 2,
        "dec_aprox": 2.56,
        "fec_aprox": 0.89,
        "eventos": 1034,
        "consumidores_afetados": 54909,
        "destoante": false,
        "baseline_mediana": 1.35,
        "baseline_limite_alerta": 3.68
      },
      {
        "competencia": "2025-03",
        "ano": 2025,
        "mes": 3,
        "dec_aprox": 1.17,
        "fec_aprox": 0.64,
        "eventos": 805,
        "consumidores_afetados": 40709,
        "destoante": false,
        "baseline_mediana": 1.23,
        "baseline_limite_alerta": 3.37
      },
      {
        "competencia": "2025-04",
        "ano": 2025,
        "mes": 4,
        "dec_aprox": 2.09,
        "fec_aprox": 0.71,
        "eventos": 837,
        "consumidores_afetados": 45561,
        "destoante": false,
        "baseline_mediana": 0.95,
        "baseline_limite_alerta": 2.59
      },
      {
        "competencia": "2025-05",
        "ano": 2025,
        "mes": 5,
        "dec_aprox": 0.56,
        "fec_aprox": 0.25,
        "eventos": 533,
        "consumidores_afetados": 15739,
        "destoante": false,
        "baseline_mediana": 0.84,
        "baseline_limite_alerta": 2.3
      },
      {
        "competencia": "2025-06",
        "ano": 2025,
        "mes": 6,
        "dec_aprox": 0.71,
        "fec_aprox": 0.32,
        "eventos": 491,
        "consumidores_afetados": 19965,
        "destoante": false,
        "baseline_mediana": 0.75,
        "baseline_limite_alerta": 2.04
      },
      {
        "competencia": "2025-07",
        "ano": 2025,
        "mes": 7,
        "dec_aprox": 0.92,
        "fec_aprox": 0.3,
        "eventos": 536,
        "consumidores_afetados": 18965,
        "destoante": false,
        "baseline_mediana": 0.72,
        "baseline_limite_alerta": 1.97
      },
      {
        "competencia": "2025-08",
        "ano": 2025,
        "mes": 8,
        "dec_aprox": 1.56,
        "fec_aprox": 1.19,
        "eventos": 668,
        "consumidores_afetados": 75731,
        "destoante": false,
        "baseline_mediana": 0.77,
        "baseline_limite_alerta": 2.12
      },
      {
        "competencia": "2025-09",
        "ano": 2025,
        "mes": 9,
        "dec_aprox": 1.17,
        "fec_aprox": 0.61,
        "eventos": 663,
        "consumidores_afetados": 39998,
        "destoante": false,
        "baseline_mediana": 1.03,
        "baseline_limite_alerta": 2.81
      },
      {
        "competencia": "2025-10",
        "ano": 2025,
        "mes": 10,
        "dec_aprox": 1.09,
        "fec_aprox": 1.06,
        "eventos": 729,
        "consumidores_afetados": 69333,
        "destoante": false,
        "baseline_mediana": 1.31,
        "baseline_limite_alerta": 3.58
      },
      {
        "competencia": "2025-11",
        "ano": 2025,
        "mes": 11,
        "dec_aprox": 0.87,
        "fec_aprox": 0.38,
        "eventos": 682,
        "consumidores_afetados": 24698,
        "destoante": false,
        "baseline_mediana": 1.08,
        "baseline_limite_alerta": 2.94
      },
      {
        "competencia": "2025-12",
        "ano": 2025,
        "mes": 12,
        "dec_aprox": 1.52,
        "fec_aprox": 0.53,
        "eventos": 1042,
        "consumidores_afetados": 35389,
        "destoante": false,
        "baseline_mediana": 1.52,
        "baseline_limite_alerta": 4.16
      },
      {
        "competencia": "2026-01",
        "ano": 2026,
        "mes": 1,
        "dec_aprox": 2.6,
        "fec_aprox": 1.1,
        "eventos": 1194,
        "consumidores_afetados": 73704,
        "destoante": false,
        "baseline_mediana": 1.65,
        "baseline_limite_alerta": 4.51
      },
      {
        "competencia": "2026-03",
        "ano": 2026,
        "mes": 3,
        "dec_aprox": 0.87,
        "fec_aprox": 0.34,
        "eventos": 656,
        "consumidores_afetados": 22508,
        "destoante": false,
        "baseline_mediana": 1.23,
        "baseline_limite_alerta": 3.37
      },
      {
        "competencia": "2026-04",
        "ano": 2026,
        "mes": 4,
        "dec_aprox": 0.58,
        "fec_aprox": 0.17,
        "eventos": 531,
        "consumidores_afetados": 11432,
        "destoante": false,
        "baseline_mediana": 0.95,
        "baseline_limite_alerta": 2.59
      },
      {
        "competencia": "2026-05",
        "ano": 2026,
        "mes": 5,
        "dec_aprox": 0.41,
        "fec_aprox": 0.18,
        "eventos": 488,
        "consumidores_afetados": 12305,
        "destoante": false,
        "baseline_mediana": 0.84,
        "baseline_limite_alerta": 2.3
      },
      {
        "competencia": "2026-06",
        "ano": 2026,
        "mes": 6,
        "dec_aprox": 0.74,
        "fec_aprox": 0.28,
        "eventos": 626,
        "consumidores_afetados": 18614,
        "destoante": false,
        "baseline_mediana": 0.75,
        "baseline_limite_alerta": 2.04
      },
      {
        "competencia": "2026-07",
        "ano": 2026,
        "mes": 7,
        "dec_aprox": 11.87,
        "fec_aprox": 3.81,
        "eventos": 1237,
        "consumidores_afetados": 253948,
        "destoante": false,
        "baseline_mediana": 0.72,
        "baseline_limite_alerta": 1.97
      }
    ],
    "mesmo_mes_anos_anteriores": [
      {
        "competencia": "2024-07",
        "dec_aprox": 0.42
      },
      {
        "competencia": "2025-07",
        "dec_aprox": 0.92
      },
      {
        "competencia": "2026-07",
        "dec_aprox": 11.87
      }
    ],
    "causas": [
      {
        "causa": "Interna - Não Programada - Meio Ambiente - Vento",
        "eventos": 429,
        "consumidores_afetados": 141789,
        "consumidor_horas": 685355.6
      },
      {
        "causa": "Interna - Não Programada - Não Classificada - Sem detalhamento",
        "eventos": 180,
        "consumidores_afetados": 86677,
        "consumidor_horas": 36791.8
      },
      {
        "causa": "Interna - Não Programada - Próprias do Sistema - Falha de material ou equipamento",
        "eventos": 414,
        "consumidores_afetados": 10123,
        "consumidor_horas": 32199.2
      },
      {
        "causa": "Interna - Não Programada - Meio Ambiente - Sem detalhamento",
        "eventos": 15,
        "consumidores_afetados": 571,
        "consumidor_horas": 13405.9
      },
      {
        "causa": "Interna - Não Programada - Próprias do Sistema - Não identificada",
        "eventos": 104,
        "consumidores_afetados": 11258,
        "consumidor_horas": 12916
      },
      {
        "causa": "Interna - Não Programada - Terceiros - Objeto na rede",
        "eventos": 20,
        "consumidores_afetados": 1047,
        "consumidor_horas": 4087.1
      },
      {
        "causa": "Interna - Não Programada - Meio Ambiente - Árvore ou vegetação",
        "eventos": 22,
        "consumidores_afetados": 1248,
        "consumidor_horas": 3478.8
      },
      {
        "causa": "Interna - Não Programada - Próprias do Sistema - Desligamento para manutenção emergencial",
        "eventos": 6,
        "consumidores_afetados": 193,
        "consumidor_horas": 876.1
      },
      {
        "causa": "Interna - Programada - Alteração - Ampliação",
        "eventos": 6,
        "consumidores_afetados": 866,
        "consumidor_horas": 680.9
      },
      {
        "causa": "Interna - Não Programada - Meio Ambiente - Animais",
        "eventos": 10,
        "consumidores_afetados": 97,
        "consumidor_horas": 281.1
      }
    ],
    "alimentadores": [
      {
        "codigo": "PCI0005",
        "eventos": 86,
        "consumidores_afetados": 9341,
        "consumidor_horas": 166308.2
      },
      {
        "codigo": "ESP017",
        "eventos": 25,
        "consumidores_afetados": 10081,
        "consumidor_horas": 85201.3
      },
      {
        "codigo": "SCZ0002",
        "eventos": 21,
        "consumidores_afetados": 3353,
        "consumidor_horas": 63129.4
      },
      {
        "codigo": "PCI0015",
        "eventos": 31,
        "consumidores_afetados": 1909,
        "consumidor_horas": 53316
      },
      {
        "codigo": "PCI0010",
        "eventos": 17,
        "consumidores_afetados": 1360,
        "consumidor_horas": 44568.8
      },
      {
        "codigo": "N2742",
        "eventos": 150,
        "consumidores_afetados": 78985,
        "consumidor_horas": 44471.6
      },
      {
        "codigo": "SPB004",
        "eventos": 60,
        "consumidores_afetados": 2703,
        "consumidor_horas": 43215.8
      },
      {
        "codigo": "N2744",
        "eventos": 67,
        "consumidores_afetados": 57773,
        "consumidor_horas": 40262.5
      },
      {
        "codigo": "ESP016",
        "eventos": 17,
        "consumidores_afetados": 7032,
        "consumidor_horas": 26956
      },
      {
        "codigo": "PCI0003",
        "eventos": 27,
        "consumidores_afetados": 5659,
        "consumidor_horas": 26437.5
      },
      {
        "codigo": "SPB003",
        "eventos": 59,
        "consumidores_afetados": 4051,
        "consumidor_horas": 20698.9
      },
      {
        "codigo": "MTO00001",
        "eventos": 4,
        "consumidores_afetados": 2924,
        "consumidor_horas": 16033.3
      },
      {
        "codigo": "PCI0013",
        "eventos": 29,
        "consumidores_afetados": 2454,
        "consumidor_horas": 15344
      },
      {
        "codigo": "PII004",
        "eventos": 13,
        "consumidores_afetados": 798,
        "consumidor_horas": 14209.7
      },
      {
        "codigo": "N6740",
        "eventos": 58,
        "consumidores_afetados": 29078,
        "consumidor_horas": 13797.1
      },
      {
        "codigo": "ESP011",
        "eventos": 3,
        "consumidores_afetados": 348,
        "consumidor_horas": 11768.3
      },
      {
        "codigo": "ESP014",
        "eventos": 13,
        "consumidores_afetados": 481,
        "consumidor_horas": 10553.4
      },
      {
        "codigo": "ESP019",
        "eventos": 6,
        "consumidores_afetados": 5963,
        "consumidor_horas": 8622.9
      },
      {
        "codigo": "PCI0011",
        "eventos": 19,
        "consumidores_afetados": 3756,
        "consumidor_horas": 7826.9
      },
      {
        "codigo": "PCI0006",
        "eventos": 26,
        "consumidores_afetados": 357,
        "consumidor_horas": 7287.3
      }
    ],
    "alimentadores_disponiveis": true
  }
};
