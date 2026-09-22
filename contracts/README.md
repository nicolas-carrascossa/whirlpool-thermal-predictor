# Contrato da API — Thermal Predictor v1

Este diretório guarda o **contrato congelado** entre o front-end e o back-end do
Thermal Predictor. O contrato é definido uma única vez e implementado por três
consumidores diferentes:

| Implementação | Onde | Fase |
|---|---|---|
| `LocalMockSource` (roda no navegador) | `src/frontend/src/sources/LocalMockSource.ts` | 0 e 1 |
| `ApiSource` (HTTP) | `src/frontend/src/sources/ApiSource.ts` | 2 |
| FastAPI + Pydantic v2 | `src/backend/app/schemas.py` | 2 e 3 |

## Arquivos

| Arquivo | Papel |
|---|---|
| `api_v1.schema.json` | JSON Schema (draft 2020-12). **Gerado**, não editar à mão. |
| `README.md` | Este documento. |

A fonte de verdade é `src/frontend/src/contract/v1.ts`. O schema é regenerado com:

```bash
cd src/frontend
npm run contract:schema     # reescreve ../../contracts/api_v1.schema.json
```

A saída é determinística (chaves ordenadas): rodar o comando sem alterar os tipos
produz um arquivo idêntico. O teste
`src/frontend/src/sources/LocalMockSource.test.ts` valida 50 respostas do mock
contra este schema com `ajv`, o que impede o schema e o código de divergirem em
silêncio.

Os três tipos-raiz ficam em `#/$defs/PredictionRequest`,
`#/$defs/PredictionResponse` e `#/$defs/Metadata`.

---

## `PredictionRequest`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `architecture` | `"BR" \| "MX"` | sim | Arquitetura de produto. Hoje só `BR` tem dados de treino. |
| `config` | `StoveConfig` | sim | As 7 variáveis de configuração do fogão. |
| `targets` | `PredictionTargets` | não | Recorte da consulta. Ausente ou vazio = todos os 77 sensores. |

### `StoveConfig`

Todos os 7 campos são obrigatórios e todos são `string`. O valor precisa ser
**exatamente** uma das opções canônicas devolvidas em
`Metadata.variables[].options` — qualquer outro valor é rejeitado (ver
[Erros](#erros)). Os enums não estão embutidos no schema de propósito: eles são
dados do dataset e podem crescer com novos ensaios sem quebrar o contrato.

| Campo | Opções canônicas (v1) | Usado pelo modelo |
|---|---|---|
| `blower_direction` | `To back`, `To front` | sim |
| `housing` | `Closed`, `Open`, `Open - Updated` | sim |
| `run_case` | `Broil C1`, `Broil C2`, `Broil Qualitative`, `Pyro` | sim |
| `deflector_hole` | `Closed`, `Open` | sim |
| `material_coil_support` | `Aluminium`, `Aluminium Plate`, `Plastic` | sim |
| `losses` | 13 perfis (`No losses`, `Simone`, `Simone Losses`, `Miro`, …) | **não** |
| `board_position` | `Center`, `Right` | **não** |

### `PredictionTargets`

| Campo | Tipo | Descrição |
|---|---|---|
| `key_areas` | `string[]` | Nomes de área (`Mainback`, `Coil Temps`, `Main Vent Sys`, `IPC Comp`, `IPC Cooling`, `Oven HMI`, `CT Knobs`). |
| `sensors` | `number[]` | Números de termopar (`tc_number`). |

Os dois filtros são **união**, não interseção: um sensor entra na resposta se
pertence a uma das áreas pedidas **ou** se seu `tc_number` foi listado. Ambos
ausentes ou vazios devolve os 77 sensores. Filtrar não altera os valores previstos
dos sensores retornados.

---

## `PredictionResponse`

| Campo | Tipo | Descrição |
|---|---|---|
| `request_id` | `string` | Identificador determinístico da consulta (`req-<hash>`). Mesma requisição → mesmo id. |
| `model_version` | `string` | Versão do preditor. `mock-0.1.0` no mock; na Fase 3 passa a ser a pasta do artefato treinado. |
| `architecture` | `"BR" \| "MX"` | Ecoa a arquitetura pedida. |
| `architecture_available` | `boolean` | `false` quando não existe modelo treinado para a arquitetura. |
| `ignored_fields` | `string[]` | Campos recebidos e **deliberadamente ignorados** pelo modelo. |
| `predictions` | `SensorPrediction[]` | Vazio quando `architecture_available` é `false`. |
| `generated_at` | `string` | Timestamp ISO-8601 da geração. |

### Semântica de `ignored_fields`

`ignored_fields` **não** é lista de erro nem de campo desconhecido. É uma
declaração explícita de que o servidor recebeu aqueles campos, aceitou-os como
válidos e **não os usou** para calcular a predição. Em v1 o valor é sempre
`["losses", "board_position"]`, por causa da hipótese H2
(`documents/documentacao.md`, seção 4.2.3): `losses` é redundante com
`deflector_hole` no desenho dos 56 ensaios (cada categoria de perdas corresponde
a um único valor do furo do defletor) e `board_position` está confundida com as
demais variáveis, sem nenhum par de ensaios que a isole.

Consequências práticas para quem consome o contrato:

- Mudar apenas `losses` ou apenas `board_position` **não muda nenhuma
  temperatura prevista**. A resposta é bit a bit igual em `predictions`.
- A UI deve mostrar esses dois campos marcados como informativos (o front usa
  `Metadata.variables[].used_by_model = false`), para o engenheiro não interpretar
  a ausência de efeito como bug.
- O campo existe para preservar rastreabilidade do ensaio, não para modelagem.

### `SensorPrediction`

| Campo | Tipo | Descrição |
|---|---|---|
| `tc_number` | `number` | Número do termopar. Chave estável do sensor. |
| `tc_name` | `string` | Nome do ponto de medição, como no dataset. |
| `key_area` | `string` | Área do produto à qual o sensor pertence. |
| `temp_c` | `number` | Temperatura prevista, em °C. |
| `error_margin_c` | `number` | Margem de erro absoluta (± °C). No mock, metade do desvio-padrão histórico do sensor, com piso de 1,0 °C; na Fase 3, o MAE do termopar. |
| `error_margin_pct` | `number` | `error_margin_c / temp_c × 100`. |
| `active_limit_c` | `number \| null` | Limite normativo do componente. `null` para sensores de monitoramento. |
| `exceeds_limit` | `boolean` | `temp_c > active_limit_c`. Sempre `false` quando não há limite. |
| `limit_ratio` | `number \| null` | `temp_c / active_limit_c`. `null` quando não há limite. É por este campo que a UI ordena o risco. |
| `is_monitor` | `boolean` | Sensor apenas de monitoramento, sem limite aplicável. |
| `monitor_reference_c` | `number \| null` | Referência informativa anotada para alguns monitores (ex.: 150 °C). Nunca deve ser usada como limite. |
| `reliability` | `Reliability` | Confiabilidade da estimativa (abaixo). |

Dos 77 sensores, **9 são monitores** (`is_monitor = true`, `active_limit_c = null`).
Para eles, `exceeds_limit` é sempre `false` e `limit_ratio` é sempre `null`: a
ausência de limite não pode virar "está tudo bem" nem "excedeu".

### Estados de `reliability`

Medem a distância entre a configuração consultada e as combinações realmente
ensaiadas, usando **distância de Hamming sobre as 5 variáveis do modelo**
(`blower_direction`, `housing`, `run_case`, `deflector_hole`,
`material_coil_support`). `losses` e `board_position` ficam de fora do cálculo,
coerentemente com `ignored_fields`.

| Estado | Distância mínima | Leitura |
|---|---|---|
| `interpolation` | 0 | A combinação existe no conjunto de ensaios. É o caso mais confiável. |
| `moderate_extrapolation` | 1 | Exatamente uma variável difere de algum ensaio real. Usar com cautela. |
| `out_of_domain` | ≥ 2 | Nenhum ensaio próximo. A predição é uma extrapolação; a UI deve exibir aviso destacado. |

Em v1 o estado é o mesmo para todos os sensores de uma resposta, porque depende
só da configuração. O campo fica por sensor para permitir, na Fase 3/4, marcar
áreas com modelo insuficiente (ex.: a decisão pendente sobre `IPC Comp`) sem
mudança de contrato.

Existem 56 ensaios no dataset, 33 combinações distintas considerando as 7
variáveis e 21 considerando apenas as 5 do modelo.

---

## `Metadata`

Resposta de `GET /api/v1/metadata`. É o que permite ao front montar toda a tela
de configuração sem hard-code.

| Campo | Tipo | Descrição |
|---|---|---|
| `contract_version` | `string` | Versão do contrato implementada pelo servidor (`1.0.0`). |
| `architectures` | `ArchitectureMeta[]` | `{ code, available, label_pt }`. Em v1: BR disponível, MX indisponível. |
| `variables` | `VariableMeta[]` | `{ name, label_pt, help_pt, options, used_by_model }` para as 7 variáveis. |
| `sensors` | `SensorMeta[]` | `{ tc_number, tc_name, key_area, active_limit_c, is_monitor, monitor_reference_c }`, 77 entradas. |
| `key_areas` | `KeyAreaMeta[]` | `{ name, label_pt, n_sensors }`, 7 entradas. |
| `reference_config` | `StoveConfig` | Configuração **real** do dataset usada como preset inicial da demo. |

`label_pt` e `help_pt` vêm de `src/frontend/src/contract/glossary_copy.ts` e são
textos originais da equipe — nenhum material confidencial do parceiro é
reproduzido.

`reference_config` em v1 é a combinação mais frequente das 7 variáveis nos 56
ensaios (5 runs):

```json
{
  "blower_direction": "To front",
  "housing": "Closed",
  "board_position": "Center",
  "run_case": "Pyro",
  "losses": "No losses",
  "deflector_hole": "Closed",
  "material_coil_support": "Aluminium"
}
```

---

## Erros

Valores fora das opções canônicas, campos ausentes ou arquitetura desconhecida
produzem um erro de contrato com mensagem em português, apontando o campo e as
opções aceitas. No front isso é a classe `ContractError`
(`{ message, field, value }`); na Fase 2 a API deve responder `422` com o mesmo
conteúdo. Arquitetura sem modelo treinado **não** é erro: devolve `200` com
`architecture_available: false` e `predictions: []`.

---

## Versionamento

- **Mudança aditiva → sobe a minor** (`1.0.0` → `1.1.0`): campo opcional novo,
  novo valor em um enum de dados (nova opção de `run_case`, nova `key_area`,
  novo sensor), novo endpoint. Clientes antigos continuam funcionando; o
  `contract_version` do metadata avisa a UI se ela pode usar o campo novo.
- **Mudança que quebra → novo caminho `/api/v2`** e um novo `v2.ts`: remover ou
  renomear campo, tornar opcional um campo obrigatório (ou o contrário), mudar
  tipo ou unidade, mudar a semântica de um campo existente. A v1 permanece
  servida durante a transição.
- O patch (`1.0.x`) fica reservado a correções de documentação e de descrição
  que não alteram forma nem semântica.

Alterou `v1.ts`? Rode `npm run contract:schema` e rode os testes: eles falham se
o schema no repositório estiver desatualizado em relação às respostas geradas.
