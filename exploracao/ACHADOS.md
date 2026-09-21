# Achados da exploração

Registro das consultas de exploração feitas sobre os arquivos Parquet da ANEEL
e das decisões de modelagem que cada resultado gerou.

**Data:** 18–19/09/2026
**Ferramenta:** DuckDB. Consultas em [`01-layouts.sql`](01-layouts.sql),
[`02-grao.sql`](02-grao.sql), [`03-chave-natural.sql`](03-chave-natural.sql),
[`04-denominador.sql`](04-denominador.sql), [`05-series.sql`](05-series.sql),
[`06-expurgo-causa.sql`](06-expurgo-causa.sql) e
[`07-pendentes.sql`](07-pendentes.sql). A §13 reúne verificações feitas durante
a escrita das migrations.

**Regra:** todo número aqui veio de uma consulta que rodou. Nada estimado.

---

## 1. A base mudou de estrutura em 2026

O arquivo de 2026 tem schema completamente diferente dos anteriores.

| Ano | Linhas | Layout |
|---|---|---|
| 2017 | 3.474.016 | antigo |
| 2023 | 9.177.911 | antigo |
| 2024 | 9.211.251 | antigo |
| 2025 | 9.715.372 | antigo |
| 2026 | 6.078.331 (competências 202601 a 202607) | **novo** |

O layout antigo (18 colunas) é idêntico de 2017 a 2025. O novo tem 26 colunas.

**Apenas 6 colunas são comuns às duas eras** (`DatGeracaoConjuntoDados`,
`DscConjuntoUnidadeConsumidora`, `DatInicioInterrupcao`, `DatFimInterrupcao`,
`NumNivelTensao`, `SigAgente`). São 20 colunas exclusivas do layout novo e 12 do
antigo. Não foi ajuste de campo — foi reformulação da base.

O layout novo traz o que não existia antes: código IBGE do município, motivo de
expurgo, taxonomia de causa em 4 níveis, código de evento e de ocorrência,
competência explícita.

**Decisão:** o ETL tem dois adaptadores, um por layout, convergindo para um
modelo canônico. Não é opcional — o layout antigo carrega a história e o novo
recebe as atualizações mensais.

### Mapeamento canônico

| Canônico | 2017–2025 | 2026+ |
|---|---|---|
| `conjunto_id` | `IdeConjuntoUnidadeConsumidora` | `CodConjUnidadeConsumidora` |
| `distribuidora_cnpj` | `NumCPFCNPJ` | `NumCNPJDistribuidora` |
| `consumidores_afetados` | `NumUnidadeConsumidora` | `QtdConsumidoresAfetados` |
| `consumidores_ativos` | `NumConsumidorConjunto` | `QtdConsumidoresAtivos` |
| `cod_interrupcao` | `NumOrdemInterrupcao` | `CodInterrupcao` |
| `alimentador` | `DscAlimentadorSubestacao` | `CodAlimentador` |
| `tipo` | `DscTipoInterrupcao` | `DscFatoGeradorTipo` |
| `causa_bruta` | `DscFatoGeradorInterrupcao` | `DscFatoGerador*` (4 campos) |
| `competencia` | derivar de `DatInicioInterrupcao` | `AnoCompetencia` / `MesCompetencia` |
| `municipio_ibge` | — não existe — | `CodMunicipioIBGE` |
| `motivo_expurgo` | — não existe — | `DscMotivoExpurgo` |

> A competência é o único campo cujo caminho difere de fato entre os
> adaptadores: no layout novo vem pronta, no antigo é derivada da data de
> início. Isso afeta o parâmetro `--ate-competencia` da ingestão.

---

## 2. Grão de análise: conjunto elétrico

Pré-requisito verificado: os CNPJs batem entre as eras (52 em 2025, 51 em 2026,
**51 em comum**), então as intersecções abaixo são válidas.

| Entidade | 2025 | 2026 | em ambos |
|---|---|---|---|
| alimentadores `(cnpj, código)` | 26.437 | 29.560 | 14.054 (**53%**) |
| **conjuntos elétricos** | **3.101** | **3.124** | **3.007 (97%)** |

Os códigos de alimentador têm formatos heterogêneos nas duas eras
(`GM-07`, `01N4` em 2025; `MOG18`, `NHA01_AL007` em 2026) e metade não
sobrevive à virada. Colisão entre distribuidoras é baixa (25.729 códigos
isolados contra 26.437 pares com CNPJ, 2,7%), então a perda é real, não
artefato de contagem.

**Decisão: o grão de análise é o conjunto elétrico.** Duas razões:

1. 97% de continuidade contra 53% — metade dos alimentadores perderia história.
2. **O denominador só existe nesse nível.** Consumidores ativos é uma contagem
   do conjunto, não do alimentador. Sem ele não há indicador normalizado, e a
   fila de investigação fica sem critério de priorização.

É também o nível em que a ANEEL apura DEC e FEC.

O alimentador fica como detalhe de drill-down dentro do conjunto.

Conjuntos que existem em apenas uma era: 94 só em 2025, 117 só em 2026.
Compatível com revisão tarifária e com o ano parcial de 2026.

---

## 3. As duas eras produzem números comparáveis

Teste mais importante da exploração: mesmos conjuntos, mesmos meses (jan–jul),
2025 contra 2026.

```
pares comparados:         20.210
razão de eventos:          1,050
razão de consumidor-hora:  1,035
```

Diferença de ~4%, compatível com variação real ano a ano. **A série histórica
atravessa a mudança de formato.**

Mediana do DEC aproximado por conjunto-mês:

| Mês | 2025 | 2026 |
|---|---|---|
| Jan | 1,64 | 1,35 |
| Fev | 1,14 | 1,41 |
| Mar | 1,07 | 1,09 |
| Abr | 0,93 | 0,94 |
| Mai | 0,79 | 0,83 |
| Jun | 0,76 | 0,77 |
| Jul | 0,73 | 0,83 |

**Sazonalidade confirmada:** curva decrescente de janeiro a agosto e ascendente
no fim do ano (set 1,07 / out 1,11 / nov 1,13 / dez 1,56 em 2025), repetida nas
duas eras. Isso justifica comparar contra o **mesmo mês de anos anteriores** em
vez de contra o mês anterior.

**Sanidade do indicador** (distribuição do DEC aproximado, 2026):

```
p50: 0,985    p90: 3,807    p99: 10,878    máx: 51,52   (h/consumidor/mês)
```

Mediana de ~0,99 h/mês equivale a ~12 h/ano — ordem de grandeza correta para
distribuição no Brasil. Fórmula validada. A cauda (p99 de 10,9 h/mês) são
conjuntos com continuidade realmente ruim, provavelmente rurais: exatamente o
que a fila de investigação deve pescar.

---

## 4. Denominador (consumidores ativos)

Confirmado que `NumUnidadeConsumidora` = afetados e `NumConsumidorConjunto` =
ativos no conjunto. Afetados excedendo ativos é ruído nas duas eras:

```
layout antigo (2025):  49 linhas em 9.715.372  (0,0005%)
layout novo   (2026):  11 linhas em 6.078.331  (0,0002%)
```

Estabilidade dentro de conjunto-mês (2025): **658 inconsistentes em 36.838
grupos (1,8%)**. Na amostra, `min = max = moda` na quase totalidade dos meses —
a ANEEL trata consumidores ativos como valor de referência mensal do conjunto,
não como contagem no instante da interrupção. É o comportamento esperado do
denominador de DEC/FEC.

Amplitude da variação ao longo do ano (razão max/min por conjunto):

```
p50: 1,0215    p95: 1,1499    p99: 1,4903    máx: 1.018,38
acima de 3x: 5 conjuntos em 3.101
```

Mediana de 1,02x é crescimento normal da base de consumidores.

### Os 5 casos extremos: 4 reconfigurações e 1 mês isolado

| Conjunto | mín | máx | razão |
|---|---|---|---|
| 17402 | 39 | 39.717 | 1.018x |
| 15737 | 3.457 | 28.295 | 8,2x |
| 14503 | 752 | 5.077 | 6,8x |
| 17238 | 2.362 | 9.809 | 4,2x |
| 16489 | 4.510 | 14.563 | 3,2x |

Aplicando o corte por conjunto-mês, **13 conjunto-mês ficam fora: 12 em
jan/fev/mar de 2025 e 1 em novembro**.

> Correção (19/09, durante o ETL): a primeira redação dizia "todos em
> jan/fev/mar". O décimo terceiro caso é o conjunto 14503, em **novembro**.

Em 4 dos 5 conjuntos (15737, 16489, 17238, 17402) o valor salta em abril e não
volta; o 15737 faz o inverso, perdendo ~25 mil consumidores enquanto o 17402
ganha ~38 mil. Nesses, não é dado sujo: é **redesenho de conjuntos com vigência
em abril de 2025**, com consumidores migrando entre eles.

O 14503 é outro fenômeno. Fica em ~4.700 o ano todo, cai para 752 em novembro
e volta para 5.077 em dezembro:

```
jan 4709 · fev 4701 · mar 4687 · abr 4692 · mai 4714 · jun 4722
jul 4739 · ago 4736 · set 4742 · out 4749 · nov  752 · dez 5077
```

Mês isolado que volta ao normal é erro de envio da distribuidora, não
redesenho. O mês sai do indicador como qualquer destoante, mas **não gera
marcação de reconfiguração**.

**Decisão:** usar a **moda** de consumidores ativos dentro de cada
conjunto-mês. Descartar do indicador normalizado o conjunto-mês cujo valor de
ativos destoe mais de 3x (para mais ou para menos) da mediana anual do próprio
conjunto — 13 casos em 36.838. O corte é por mês, não por conjunto inteiro: um
conjunto com 11 meses bons e 1 quebrado deve perder só o mês ruim.

Marcar o conjunto como tendo sofrido reconfiguração no período, para que a fila
de investigação apresente uma nota em vez de um alerta — mudança administrativa
não é anomalia operacional.

**Regra da marcação (definida no ETL):** só há reconfiguração quando o patamar
muda e *fica*. A partir do primeiro mês normal após o último destoante,
compara-se a mediana de antes com a de depois: precisa diferir mais de **2x**,
com pelo menos **2 meses de cada lado**. O limiar é 2x e não 3x porque o 16489
muda de patamar a 3,19x — margem estreita demais para uma regra de corte. Em
2025 a regra produz 4 reconfigurações, todas em abril, e deixa o 14503 de fora.

---

## 5. Chave natural — regras diferentes por era

### Layout novo (2026)

```
linhas:                               6.078.331
(cnpj, cod_interrupcao, dat_inicio):  6.077.033  →  1.298 duplicatas (0,02%)
+ alimentador:                        6.077.033  →  não ajuda
```

Concentradas em 3 distribuidoras:

| Distribuidora | Linhas envolvidas |
|---|---|
| CPFL Jaguari | 1.954 |
| COCEL | 614 |
| COPEL-DIS | 28 |

São **dois fenômenos distintos**, não um:

- **Precisão inconsistente** (CPFL Jaguari): mesma ocorrência enviada com
  `DatFimInterrupcao` truncado no minuto e com segundos (`07:01:00` e
  `07:01:16`).
- **Envio repetido** (COCEL, COPEL-DIS): linhas idênticas, inclusive no
  `DatFimInterrupcao`.

A contagem confirma que não é um-a-um: 1.647 linhas truncadas contra 949 com
segundos, dentro de 2.596 linhas em grupos duplicados.

**Decisão:** índice único em `(distribuidora_cnpj, cod_interrupcao,
dat_inicio)`. Deduplicar no ETL com `row_number()` priorizando a linha de maior
precisão (`second(dat_fim) <> 0`) e desempatando por `dat_fim DESC` —
determinístico e resolve os dois fenômenos. Verificado: 6.077.033 mantidas,
**1.298 descartadas**. Contabilizar em `pipeline_runs`.

### Layout antigo (2025)

Nenhuma combinação de colunas torna a linha única:

```
linhas:            9.715.372
+ data:            9.158.711
+ conjunto:        9.238.841
+ alimentador:     9.277.098
```

Mas isso **não são duplicatas**. Das 9.277.098 ocorrências distintas,
**9.010.648 (97%) têm linha única**; a média é de 1,05 linhas por ocorrência,
com máximo de 81.

O desdobramento tem naturezas diferentes e a semântica exata não foi
determinada. Exemplos observados:

```
PCA13, início 11:47:11 → fins 17:25:11 (134 afetados) e 17:44:06 (1 afetado)
QLB09, início 09:00:15 → mesmo fim 12:30:16, com 1 e 75 afetados
```

O primeiro parece recomposição em etapas; o segundo, separação por trecho ou
classe de consumidor, já que o fim é idêntico.

**Decisão:** somar as linhas está correto para consumidor-hora
independentemente da causa do desdobramento. Adicionar coluna de sequência à
chave: `row_number()` particionado por
`(cnpj, ordem, conjunto, alimentador, inicio)` ordenado por
`(dat_fim, afetados)`.

**Verificado: a chave fecha — 9.715.372 linhas, 9.715.372 chaves distintas.**
Mantém idempotência sem chave sintética aleatória.

> ⚠️ O alimentador entra na chave e **tem nulos no layout antigo** (ver §13).
> Como o Postgres trata `NULL` como distinto em índice único, a garantia de
> unicidade evaporaria nessas linhas. A coluna é `NOT NULL DEFAULT ''` e o ETL
> converte nulo em string vazia.

---

## 6. Expurgos — só existem no layout novo

Distribuição de `DscMotivoExpurgo` em 2026:

| Motivo | Linhas | % |
|---|---|---|
| Não houve Expurgo | 4.581.585 | 75,38% |
| ISE por meio de CHI | 815.599 | 13,42% |
| Interrupção em Dia Crítico | 360.848 | 5,94% |
| Falha na instalação da UC sem afetar terceiros | 235.415 | 3,87% |
| Suspensão por inadimplemento | 46.536 | 0,77% |
| Origem externa ao sistema de distribuição | 23.123 | 0,38% |
| Obras de interesse exclusivo do usuário | 12.586 | 0,21% |
| ISE por meio de decreto | 2.580 | 0,04% |
| Atuação de ERAC (ONS) | 58 | — |
| Racionamento instituído pela União | 1 | — |

**Total expurgado: 1.496.746 de 6.078.331 (24,62%).**

> ⚠️ **O campo nunca é nulo** (verificado: 0 nulos em 6.078.331). Quando não há
> expurgo, vem o texto `"Não houve Expurgo"`. Filtrar por `IS NULL` zera o
> indicador inteiro.

### O expurgo é uniforme entre conjuntos

Taxa de expurgo por conjunto:

```
p50: 0,256    p90: 0,407    p99: 0,514
```

Praticamente todo conjunto tem em torno de um quarto das ocorrências
expurgadas. **É característica sistêmica da base, não marcador regional** — não
serve para distinguir "rede ruim" de "região de temporal" no drill-down.

Efeito colateral positivo: como o viés é quase constante entre conjuntos,
filtrar ou não filtrar desloca todos de forma semelhante, sem reordenar
significativamente o ranking.

No layout antigo não há equivalente. `DscTipoInterrupcao` só separa:

```
Não Programada:  9.194.331
Programada:        521.041
```

E `IdeMotivoInterrupcao` tem 9 valores, 76% deles em `0`, sem correspondência
com as categorias de expurgo de 2026.

**Decisão:** preservar no banco (`motivo_expurgo` texto, `expurgado` booleano
derivado), não descartar na ingestão.

> A coluna `expurgado` **preserva o nulo** no layout antigo. Nulo ali significa
> *desconhecido*, não *não expurgado* — tratar como `false` enviesaria qualquer
> comparação entre eras.

**Para a série histórica, calcular o indicador SEM filtro de expurgo em todas
as competências**, inclusive 2026. Motivo: 2024–2025 não têm expurgo
identificável, e filtrar só o período recente faria 2026 parecer
artificialmente melhor. O indicador filtrado fica disponível apenas nas telas
restritas a 2026+.

---

## 7. Causa da interrupção — não normalizar no MVP

`DscFatoGeradorInterrupcao` (2025) tem **705 valores distintos** para o que em
2026 são 4 campos com cardinalidade 2 / 2 / 9 / 34.

É a mesma hierarquia concatenada, mas cada distribuidora escreve do seu jeito:

```
INTERNA;NAO PROGRAMADA;PROPRIAS DO SISTEMA;FALHA DE MATERIAL OU EQUIPAMENTO
Interna-Não programada-Próprias do sistema-Falha de material ou equipamento
INTERNA - NAO PROGRAMADA - PROPRIAS DO SISTEMA - FALHA DE MATERIAL OU EQUIPAMENTO
INTERNO - NAO PROGRAMADA - PROPRIAS DO SISTEMA - FALHA DE MATERIAL OU EQUIPAMENTO
```

Separador `;`, `-` ou ` - `; com e sem acento; caixa variada; e pelo menos um
erro de grafia (`INTERNO` em vez de `INTERNA`).

Padronizando caixa, acento e separador, a cardinalidade cai de **705 para
286** — ainda muito distante dos ~34 detalhes do layout novo, porque sobram
diferenças de vocabulário entre distribuidoras.

**Decisão:** armazenar o texto bruto. Causa não entra no indicador nem na
detecção de anomalia; aparece apenas na tela de detalhe. Normalização completa
fica como melhoria futura.

---

## 8. Cobertura por competência

Contagem de conjuntos por mês, como percentual do mês de maior cobertura:

```
meses completos:      91,5% a 100%
dez/2025 (era nova):   1 conjunto   (0,0%)
ago/2026:             25 conjuntos  (0,8%)
```

Os dois casos extremos são eventos vazando pelas bordas do arquivo — o arquivo
de 2026 vai só até a competência 202607.

**Decisão:** filtrar por competência, não por data de início. Descartar do
baseline e da fila de investigação a competência cuja cobertura fique abaixo de
**50% da cobertura máxima** — corte simples que pega os dois casos sem risco de
excluir mês legítimo (o mais baixo entre os completos é fev/2026, com 91,5%).

A regra não é persistida no schema: ela compara contra "o mês de maior
cobertura", que muda conforme novos dados entram, então pertence à camada de
agregação, não à de ingestão.

Comparações devem ser sempre por conjunto, nunca por total agregado, para que
diferença de cobertura entre meses não entre no cálculo.

> Confirmado durante o ETL: por competência, a borda de agosto **não existe**.
> O arquivo de 2026 traz apenas as competências 01 a 07, e os 25 conjuntos que
> apareciam em agosto vinham da agregação por data de início. A decisão de
> adotar competência como eixo temporal se sustenta empiricamente.

> **A regra dos 50% não descarta nada no recorte atual** (verificado sobre
> `conjunto_competencia`, 2024–2026): a competência de menor cobertura é
> fev/2026, com 91,5% do máximo — muito acima do corte. Tanto a borda de agosto
> quanto a de dez/2025 eram artefato da agregação por data de início e somem
> quando o eixo é a competência.
>
> A regra fica implementada como **guarda para competências futuras publicadas
> parcialmente**, que é o caso que vai acontecer a cada republicação mensal da
> ANEEL, e não como filtro atuante hoje.

---

## 9. Duração das interrupções

Layout novo (2026), sobre 6.058.032 registros com datas válidas:

```
duração negativa:        0
duração zero:        4.959
acima de 24h:      220.064  (3,63%)
acima de 7 dias:       843  (0,01%)
mediana:               197 min
p95:                 1.294 min
máximo:            216.106 min  (~150 dias)

sem datas:          20.299 registros
```

> Os 20.299 registros sem data **não têm nem início nem fim** — verificado:
> `ambos nulos = 20.299`, `só início nulo = 0`, `só fim nulo = 0`. É uma regra
> de descarte só, não duas.

Layout antigo, sobre os dois anos do recorte:

```
2024:  5.633 acima de 7 dias
2025:  1.481 acima de 7 dias · 0 negativas · mediana 208 min
       máximo 70.568 min (~49 dias) · nenhum registro sem data
```

2024 tem quase 4x mais casos acima de 7 dias que 2025, com volume de linhas
parecido. A causa não foi investigada — pode ser característica do ano ou de
alguma distribuidora específica. Como a regra é manter e contar, não afeta o
indicador.

Mediana de ~3h e 3,6% acima de 24h são valores altos para interrupção de
distribuição, mas consistentes entre as duas eras e plausíveis em área rural,
onde o religamento pode levar dias.

**Decisão:** não descartar por duração. Gravar tudo e contabilizar as acima de
7 dias em `pipeline_runs` (a flag não foi para a tabela de fatos: 843 casos em
6M nunca serão critério de filtro). Descartar apenas os registros **sem datas**,
já que sem fim não há consumidor-hora calculável.

---

## 10. Município (só no layout novo)

```
com 7 dígitos:   5.982.075  (98,4%)  → válidos
malformados:        96.256  (1,6%)
nulos:                   0
```

Os malformados têm 1, 2, 3, 4 ou 5 dígitos, distribuídos de forma quase
uniforme — não é zero à esquerda perdido, é campo preenchido com código
interno.

**Todos os 96.256 vêm de uma única distribuidora: CELG (Goiás).**

Os 96.256 não estão espalhados pelo ano: concentram-se em **janeiro (63.035)
e maio (33.221)**, sem ocorrência nos demais meses. É falha pontual de envio
em duas competências, não prática sistemática da distribuidora.

Considerando apenas os códigos válidos: **27 UFs e 5.528 municípios** — números
corretos para o Brasil. A derivação da UF pelos 2 primeiros dígitos funciona.

**Decisão:** aceitar apenas `length = 7`; o restante grava `municipio_ibge` como
nulo e conta como registro sem município (não como inválido — o conjunto
elétrico, que é o grão do projeto, continua válido).

---

## 11. Cobertura de distribuidoras

```
2017:  39 distribuidoras
2024:  52
2025:  52
2026:  51
```

A base não cobre todos os agentes de distribuição do país — permissionárias e
cooperativas menores não aparecem. A cobertura cresceu ao longo do tempo, o que
significa que parte de qualquer "aumento" observado em série longa pode ser
entrada de distribuidora na base, não piora de rede.

No recorte adotado (2024–2026) a contagem é estável, então o efeito é
desprezível. Registrar como limitação no README.

---

## 12. Validação de 2024

```
linhas:           9.211.251
conjuntos:            3.079
distribuidoras:          52
meses:                   12  (01/01 a 31/12)
```

Continuidade de conjuntos: 3.035 em comum com 2025, 2.941 com 2026. Entra no
recorte sem ressalva.

---

## 13. Verificações durante a modelagem (19/09)

Quatro checagens feitas antes de fechar o schema, todas com impacto direto nas
migrations.

### Alimentador tem nulos no layout antigo

```
2024:  58 nulos em 9.211.251
2025: 821 nulos em 9.715.372
2026:   0 nulos em 6.078.331
```

String vazia não ocorre em nenhuma das eras. Como o alimentador entra na chave
natural e o Postgres trata `NULL` como distinto em índice único, essas linhas
passariam sem validação de unicidade.

**Decisão:** coluna `NOT NULL DEFAULT ''`, com o ETL convertendo nulo em string
vazia. Confirmado em teste: a chave rejeita duplicata com alimentador vazio.

Nenhuma outra coluna da chave tem nulos (CNPJ, código de interrupção, conjunto
e data de início: 0 nulos nas duas eras — exceto as 20.299 linhas sem datas da
§9, que são descartadas).

### CNPJ perde o zero à esquerda na origem

```
2025:  13 a 14 dígitos,  52 distintos,  menor 1377555000110
2026:  13 a 14 dígitos,  51 distintos,  menor 1377555000110
```

O campo é `INT64` no Parquet nas duas eras, então `01377555000110` chega como
`1377555000110`. O valor é idêntico entre as eras, o que preserva a junção,
mas a normalização precisa ser a mesma dos dois lados — senão a mesma
distribuidora entra duas vezes.

**Decisão:** armazenar como `bigint`; a formatação com zero à esquerda fica na
camada de apresentação.

### Conjunto não colide entre distribuidoras

```
2025:                 3.101 códigos distintos = 3.101 pares (cnpj, conjunto)
2024+2025+2026 (união): 3.262 códigos distintos = 3.262 pares
```

Zero colisão no recorte inteiro. O código de conjunto é globalmente único,
diferente do código de alimentador.

**Decisão:** chave primária de coluna única em `conjuntos`.

> Observação: a unicidade é **observada em três anos de dados**, não garantida
> por documentação da ANEEL. Se uma carga futura trouxer colisão, a chave
> precisa virar composta — risco aceito conscientemente, com correção a custo
> de uma migration.

### Tipos físicos no Parquet

| Campo | Tipo |
|---|---|
| conjunto, CNPJ, município, competência, afetados, ativos | `INT64` |
| código de interrupção, alimentador, evento, ocorrência | `BYTE_ARRAY` |

Justifica `bigint` para conjunto e CNPJ, `text` para código de interrupção.

---

## 14. Verificações durante o motor de anomalias (19/09)

### Corte de volume: 100 consumidores ativos, não 1.000

O corte proposto inicialmente era 1.000 consumidores ativos. Em 07/2026 ele
removia 6 conjuntos, e olhar quem eram mudou a decisão:

| Conjunto | Nome | Distribuidora | Ativos | DEC aprox |
|---|---|---|---|---|
| 0 | *(sem nome)* | COPEL-DIS | 4 | 0,30 |
| 12863 | MIMOSO | EMS | 711 | 9,02 |
| 12803 | BONITO CEDERB | EMS | 796 | 16,05 |
| 12589 | Santa Rosa | EAC | 942 | 4,60 |
| 15512 | CARAJÁS II | EQUATORIAL PA | 943 | 4,12 |
| 12658 | São Carlos | ERO | 952 | 9,38 |

Os cinco com nome são **conjuntos rurais legítimos**, com DEC de 4 a 16 h/mês —
exatamente a cauda que a §3 diz que a fila deve pescar. Um corte de 1.000 os
tiraria da fila por serem pequenos, que é o oposto do objetivo.

O conjunto **0 da COPEL-DIS** é outro caso: código inválido, sem nome, 4
consumidores, 49 linhas só no layout novo (fev a jul/2026). É o único conjunto
sem nome na base. Fica **excluído por identidade**, não por tamanho.

O corte ficou em **100 consumidores ativos**, como guarda contra denominador
quebrado e não como filtro de tamanho. Na base inteira, só 14 conjunto-mês
ficam abaixo dele, com 1 a 39 ativos — entre eles o 17402 de jan/2025, já
marcado como destoante. Não há nada entre 39 e 711: o corte cai num vazio
natural da distribuição.

### A frota muda por baixo: comparação ano a ano precisa ser pareada

Ao desenhar o ranking por distribuidora surgiu a dúvida se a base de
comparação do mesmo mês do ano anterior está íntegra. Medido em quatro
competências de 2026:

```
alvo       distribuidoras   base ausente   base parcial   base ok
2026-01          49              0              0            49
2026-03          49              0              0            49
2026-05          49              0              0            49
2026-07          50              0              0            50
```

No grão distribuidora-competência a base é **100% íntegra** — a hipótese de
que faltaria cobertura não se confirmou.

O problema está um grão abaixo. Como o indicador da distribuidora é a mediana
**sobre os conjuntos**, o que importa é a frota ser a mesma nos dois meses. Em
jul/2026 contra jul/2025:

| Distribuidora | Conjuntos em jul/2026 | Em ambos | Sobreposição |
|---|---|---|---|
| DMED | 4 | 0 | **0%** |
| EQUATORIAL MA | 117 | 70 | 60% |
| ETO | 57 | 38 | 67% |
| SAELPA | 72 | 51 | 71% |
| Neoenergia PE | 142 | 125 | 88% |
| EDP ES | 44 | 40 | 91% |

As outras 44 têm 95% ou mais. A DMED trocou os quatro códigos de conjunto na
virada do ano — 12777, 12780 e 12783 vão até dez/2025; 17437 a 17440 começam
em jan/2026 — e compararia duas frotas sem um único conjunto em comum.

É o mesmo fenômeno da reconfiguração de abril/2025 (§4), num grão diferente:
lá o conjunto continuava e mudava de tamanho; aqui o código do conjunto é
substituído.

**Decisão:** a variação contra o ano anterior é calculada **apenas sobre os
conjuntos presentes nos dois meses**, e a resposta da API devolve sempre a
sobreposição junto do número. Abaixo de 50% de sobreposição a variação vai
nula, com motivo. É a aplicação literal do que a §8 já determina —
"comparações devem ser sempre por conjunto, nunca por total agregado".

> Não trocar isso por uma comparação de totais agregados depois: o número
> volta a mentir exatamente nesses seis casos, e de forma silenciosa.

**A detecção não é afetada.** Verificado: os 91 conjuntos das quatro
distribuidoras de baixa sobreposição presentes em jul/2026 e ausentes em
jul/2025 estão todos em `sem_baseline`, com 6 pontos cada, nenhum com 12 ou
mais. Nenhum conjunto é avaliado contra o histórico de outra frota.

### A fila se renova quase inteira todo mês

Ao montar o boletim, medida a rotatividade da fila entre competências
consecutivas de 2026:

| Competência | Alertas | Entraram | % da fila | Saíram |
|---|---|---|---|---|
| 2026-03 | 110 | 68 | 62% | 218 |
| 2026-04 | 152 | 145 | 95% | 103 |
| 2026-05 | 204 | 175 | 86% | 123 |
| 2026-06 | 195 | 154 | 79% | 163 |
| 2026-07 | 358 | 324 | 91% | 161 |

Entre 62% e 95% dos alertas são novos a cada mês. Não é defeito: o alerta é
sobre o desvio **daquela competência**, não sobre um estado que persiste. Mas
significa que "324 conjuntos entraram na fila" parece manchete e é rotina.

**Decisão:** o campo continua na API, com a faixa documentada no Swagger para
quem consome não o ler como notícia. O destaque do boletim passa a ser o que
*não* é rotina: conjuntos que **pioraram de severidade** (moderada para alta)
e os **reincidentes** — na fila em 3 competências seguidas. Em 07/2026 são 8
reincidentes, contra 57 que alertam em 2 dos últimos 3 meses.

### Código de conjunto aposentado não é mês sem interrupção

A situação `ausente` nasceu com dois motivos, e o segundo estava errado. Dos
131 ausentes em 07/2026, 85 vinham como `conjunto_isolado`, com a mensagem
"sem interrupções registradas nesta competência". São estas as distribuidoras
deles:

```
EQUATORIAL MA 28 · SAELPA 24 · ETO 17 · Neoenergia PE 9 · EDP ES 4 · DMED 3
```

Exatamente as **seis da tabela de baixa sobreposição** acima — as que
renumeraram a frota. E todos os 85 estão ausentes há precisamente 7 meses,
isto é, desde dez/2025. Não são conjuntos quietos: são códigos aposentados, e
a mensagem afirmava o contrário do que acontecia.

**Decisão:** terceiro motivo, `conjunto_encerrado`, para ausência de **3
competências ou mais** com a distribuidora enviando normalmente. Um mês de
falta é plausível e dois ainda são; três não. A escolha é semântica e não
ajuste aos dados — hoje todos os casos estão em 7 meses, então qualquer corte
entre 2 e 7 daria a mesma divisão.

Com a regra, 07/2026 fica com **85 encerrados, 46 por distribuidora ausente e
0 isolados**, e a mensagem passa a ser "Sem registros desde 2025-12. O código
de conjunto provavelmente foi aposentado".

> O preço é um atraso de duas competências: no mês em que o código some, ele
> ainda aparece como isolado. Inevitável — não dá para saber que um código foi
> aposentado no mês em que ele falta pela primeira vez. Em 06/2026 a regra
> separa corretamente 2 casos genuínos de mês isolado dos 85 encerrados.

### Os maiores desvios não vêm de registros longos

Os dois maiores desvios de 07/2026 — Jaboticabal 2 (#16444, DEC 47,38, 182,8
IQR) e Ribeirão Preto 4 (#13970, DEC 21,76, 156,9 IQR), ambos da
CPFL-Paulista — levantaram a suspeita de estarem apoiados em interrupções
acima de 7 dias, aquelas que a §9 manda manter e contar. **A suspeita não se
confirmou:**

```
#13970   490 eventos   0 acima de 7 dias   máx 3,5 dias
#16444   921 eventos   1 acima de 7 dias   máx 7,6 dias
         o único registro longo vale 546 de 1.361.787 consumidor-hora = 0,04%
```

Também não é volume de eventos. O #16444 teve **mais** eventos em janeiro
(1.072) com DEC 0,60, contra 921 em julho com DEC 47,38 — 79 vezes maior. E a
concentração é baixa: o maior evento é 6% do consumidor-hora e os 20 maiores
somam 42%.

O que muda é o **perfil de cada evento**:

| Conjunto | Mês | Eventos | Duração mediana | Duração média | Afetados por evento |
|---|---|---|---|---|---|
| #16444 | jan | 1.072 | 147 min | 288 min | 6 |
| #16444 | jun | 212 | 174 min | 218 min | 31 |
| #16444 | **jul** | 921 | **342 min** | **1.264 min** | **101** |
| #13970 | jan | 289 | 94 min | 141 min | 16 |
| #13970 | **jul** | 490 | **364 min** | **751 min** | **154** |

A duração mediana dobra, a média sextuplica e o público por evento multiplica
por 17. Não é registro suspeito: é um mês inteiro em que cada interrupção
durou mais e atingiu mais gente — perfil de evento climático severo,
consistente com o que a mesma competência mostra no Rio (§14, saturação de
frota).

**Decisão:** o sinal na fila não é "contém interrupção acima de 7 dias", que
aqui não pegaria nada de útil, e sim **concentração**: quanto do
consumidor-hora vem dos 5 maiores eventos. É a medida que responde à pergunta
original — o alerta está apoiado em poucos registros?

O limiar é **0,7**, não 0,5. A concentração mediana da fila de 07/2026 é
**0,43**, então metade é o comportamento típico:

```
>= 0,5  →  131 dos 358 alertas  (37% da fila)
>= 0,6  →   88                  (25%)
>= 0,7  →   58                  (16%)
>= 0,8  →   33                  ( 9%)
>= 0,9  →   19                  ( 5%)
```

Em 0,7 o sinal acende em 58 alertas e **não** acende nos dois conjuntos
investigados (0,242 e 0,180), que é o comportamento correto: neles o desvio
é real e espalhado, não artefato de meia dúzia de registros.

### Queda: Tukey para baixo é inalcançável

A classificação de queda usava a cerca de Tukey (`q1 − 1,5·IQR`), simétrica à
de cima. Medindo em 07/2026, sobre 2.962 conjuntos avaliados:

```
cerca q1 − 1,5·IQR ≤ 0:   2.619 conjuntos  (88%)
cerca q1 − 3,0·IQR ≤ 0:   2.958 conjuntos  (99,9%)
conjuntos abaixo da cerca de 1,5:   1
conjuntos abaixo da cerca de 3,0:   0
```

O DEC tem piso em zero, então a cauda inferior é curta e a cerca cai abaixo de
zero na quase totalidade dos casos: a queda era estruturalmente impossível.

**Alternativa avaliada — Tukey em escala log.** É a correção estatisticamente
mais correta, porque torna as cercas multiplicativas e simétricas. Simulada em
07/2026:

| | Tukey linear (atual) | Tukey em log |
|---|---|---|
| alta | 199 | 60 |
| moderada | 159 | 97 |
| queda | 1 | 25 |

**Descartada conscientemente:** ela conserta a queda, mas reclassifica o lado de
cima, derrubando os altos de 199 para 60 e transformando 157 das 159 moderadas
em normais. Mudaria a fila já validada caso a caso, e o ganho é na cauda que
não é o objeto do produto.

**Decisão:** queda por razão contra a mediana — `dec_norm < 0,25 × mediana`,
"caiu a menos de um quarto do normal". Dá 40 casos em 07/2026 (com 0,5× seriam
226, demais para um sinal que fica fora da fila). O lado de cima continua com
Tukey linear, intocado.

### Sigla e nome chegam com espaços à direita

As 52 siglas de distribuidora vêm preenchidas com espaços à direita na
origem, assim como 5 nomes de conjunto. Filtrar por `sigla = 'LIGHT SESA'`
não encontra nada.

**Decisão:** aparar os campos de exibição (sigla e nome da distribuidora, nome
do conjunto) no ETL. **Não** aparar `alimentador`, que tem o mesmo problema:
ele entra na chave natural, e apará-lo mudaria a chave de linhas já gravadas.
Só 2 valores em 40.733 colapsariam — não compensa uma recarga de 25M de
linhas.

---

## Recorte final do projeto

- **Período:** 2024, 2025 e 2026 (~25M de linhas)
- **Grão:** conjunto elétrico
- **Indicador:** consumidor-hora ÷ consumidores ativos (DEC aproximado) e
  afetados ÷ ativos (FEC aproximado)
- **Baseline de anomalia:** mediana + IQR sobre a história inteira do
  conjunto, dessazonalizada por índice mensal apurado só no passado (~29
  pontos, contra 2 do mesmo mês estrito)
- **Eixo temporal:** competência

> Os indicadores são **aproximações** reconstruídas a partir dos dados brutos.
> Não são os valores oficiais de DEC/FEC apurados pela ANEEL, que seguem
> metodologia própria de expurgo e apuração.

### Regras de tratamento consolidadas

| Situação | Tratamento | Volume observado |
|---|---|---|
| Duplicata na chave (2026) | dedup determinística | 1.298 |
| Sem datas (início e fim nulos) | descartar | 20.299 (2026) |
| Município com ≠ 7 dígitos | `municipio_ibge` nulo | 96.256 (2026, CELG, jan e mai) |
| Alimentador nulo | converter para `''` | 58 (2024), 821 (2025), 0 (2026) |
| CNPJ com 13 dígitos | normalização idêntica nas duas eras | — |
| Ativos destoando 3x da mediana | fora do indicador | 13 conjunto-mês (2025) |
| Reconfiguração de conjunto | nota, não alerta | 4 conjuntos (abr/2025) |
| Competência abaixo de 50% de cobertura | fora do baseline | 0 no recorte (guarda) |
| Distribuidora abaixo de 50% dos seus conjuntos | fora do baseline dela | 1 (ERO, fev/2025) |
| Conjunto com menos de 100 ativos | fora da fila | 14 conjunto-mês |
| Conjunto 0 (COPEL-DIS, sem nome) | fora da fila, por identidade | 1 |
| Duração acima de 7 dias | manter, só contar | 843 (2026), 1.481 (2025), 5.633 (2024) |

---

## Em aberto

Nada bloqueante. Melhorias possíveis, se sobrar tempo:

- [ ] Normalizar `DscFatoGeradorInterrupcao` do layout antigo para a taxonomia
      de 4 níveis do novo (705 → 286 com normalização simples; chegar a ~34
      exige mapeamento manual de vocabulário)
- [ ] Determinar a semântica do desdobramento de linhas no layout antigo
      (3% das ocorrências)
- [ ] Investigar por que 2024 tem 4x mais interrupções acima de 7 dias que 2025
- [ ] Avaliar se 2023 vale ser incluído no recorte (mais 9,2M de linhas, um ano
      a mais de baseline sazonal)
- [ ] Avaliar `char(14)` para o CNPJ, eliminando a dependência de formatação na
      camada de apresentação