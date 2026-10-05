/**
 * Contrato v1 do Thermal Predictor.
 *
 * Fonte única de verdade dos tipos trocados entre front-end e back-end.
 * O JSON Schema em `contracts/api_v1.schema.json` é GERADO a partir deste
 * arquivo (`npm run contract:schema`) — não edite o schema à mão.
 *
 * Regra de versionamento: mudanças aditivas (campo opcional novo, opção nova
 * em um enum de dados) sobem a minor; mudanças que quebram consumidores
 * exigem um novo caminho `/api/v2` e um novo arquivo `v2.ts`.
 */

export const CONTRACT_VERSION = '1.2.0'

/** Arquitetura de produto. Hoje só BR possui dados de treino. */
export type Architecture = 'BR' | 'MX'

/**
 * Família de modelo que atende uma `key_area` (v1.1).
 *
 * O algoritmo **não é escolhido pelo cliente**: cada área é atendida por um
 * algoritmo fixo, definido pelo desempenho medido naquela área e servido em
 * `Metadata.area_algorithms`. Por isso não existe campo de algoritmo em
 * `PredictionRequest` — só de saída.
 */
export type AlgorithmCode = 'random_forest' | 'gradient_boosting'

/**
 * Configuração do fogão: as 7 colunas categóricas do dataset.
 * Os valores devem ser exatamente as opções canônicas devolvidas por
 * `getMetadata().variables[].options`.
 */
export interface StoveConfig {
  /** Direção em que o blower de resfriamento empurra o ar. */
  blower_direction: string
  /** Estado da carcaça da eletrônica. */
  housing: string
  /** Posição da placa eletrônica. */
  board_position: string
  /** Modo de operação simulado. */
  run_case: string
  /** Perfil de perdas térmicas assumido na simulação. */
  losses: string
  /** Furo do defletor de ar. */
  deflector_hole: string
  /** Material do suporte da resistência. */
  material_coil_support: string
}

/** Recorte da consulta. Ambos vazios/ausentes = todos os 77 sensores. */
export interface PredictionTargets {
  /** Nomes de `key_area` (ex.: "IPC Comp"). */
  key_areas?: string[]
  /** Números de termopar (`tc_number`). */
  sensors?: number[]
}

export interface PredictionRequest {
  architecture: Architecture
  config: StoveConfig
  targets?: PredictionTargets
}

/**
 * Confiabilidade da estimativa, por distância de Hamming entre a configuração
 * consultada e as combinações presentes no conjunto de treino, considerando as
 * variáveis que o modelo no ar usa — 5 no mock da Fase 1 (H2), as 7 nos modelos
 * treinados. Medir sobre menos variáveis do que o modelo usa faz duas entradas
 * distintas parecerem a mesma e devolve o rótulo de maior confiança para uma
 * combinação inédita.
 * - `interpolation`: combinação existe no treino (distância 0).
 * - `moderate_extrapolation`: exatamente 1 variável diferente.
 * - `out_of_domain`: 2 ou mais variáveis diferentes.
 */
export type Reliability = 'interpolation' | 'moderate_extrapolation' | 'out_of_domain'

export interface SensorPrediction {
  tc_number: number
  tc_name: string
  key_area: string
  /** Temperatura prevista, em °C. */
  temp_c: number
  /** Margem de erro absoluta, em °C (± temp_c). */
  error_margin_c: number
  /** Margem de erro relativa, em % de `temp_c`. */
  error_margin_pct: number
  /** Limite normativo do componente, em °C. `null` para sensores de monitoramento. */
  active_limit_c: number | null
  /** `true` quando `temp_c` > `active_limit_c`. Sempre `false` sem limite. */
  exceeds_limit: boolean
  /** `temp_c / active_limit_c`. `null` quando não há limite. */
  limit_ratio: number | null
  /** Sensor apenas de monitoramento, sem limite normativo aplicável. */
  is_monitor: boolean
  /** Referência informativa (°C) anotada para sensores de monitoramento. */
  monitor_reference_c: number | null
  reliability: Reliability
  /**
   * Algoritmo que produziu esta predição (v1.1). É a fonte de verdade da
   * procedência: viaja com cada predição e sobrevive a qualquer filtro que a
   * interface aplique depois. Decorre da `key_area`, nunca de escolha do cliente.
   */
  algorithm: AlgorithmCode
}

export interface PredictionResponse {
  /** Identificador determinístico da consulta (mesma request → mesmo id). */
  request_id: string
  /**
   * Versão do CONJUNTO de artefatos que respondeu (ex.: `"models-1.0.0"`).
   *
   * MUDANÇA DE SEMÂNTICA EM v1.1: até a v1.0 este campo identificava o único
   * preditor da resposta (`"mock-0.1.0"`). Com dois algoritmos respondendo na
   * mesma chamada, uma string só não identifica mais quem produziu o quê:
   * passou a ser a versão do manifesto de modelos, e a versão por algoritmo
   * vive em `AlgorithmMeta.model_version`. O modo mock continua devolvendo
   * `"mock-0.1.0"`, que é a versão do seu próprio "conjunto".
   */
  model_version: string
  architecture: Architecture
  /** `false` quando não há modelo treinado para a arquitetura pedida. */
  architecture_available: boolean
  /** Campos da config recebidos e deliberadamente ignorados pelo modelo. */
  ignored_fields: string[]
  /** Vazio quando `architecture_available` é `false`. */
  predictions: SensorPrediction[]
  /**
   * Mapa de conveniência `key_area` → algoritmo das áreas presentes NESTA
   * resposta (v1.1) — deixa a interface montar cabeçalhos por área sem varrer
   * as 76 predições. Vazio quando `predictions` está vazio.
   */
  algorithm_by_area: Record<string, AlgorithmCode>
  /** Timestamp ISO-8601 da geração. */
  generated_at: string
}

export interface VariableMeta {
  name: string
  label_pt: string
  help_pt: string
  options: string[]
  /**
   * Se o modelo que respondeu usa esta variável. **Não é constante**: depende
   * do preditor no ar. O mock da Fase 1 exclui `losses` e `board_position`
   * (H2), mas os modelos treinados usam as 7 — e em `IPC Cooling` e
   * `IPC Comp` `losses` é a variável mais importante. A interface tem de ler
   * este campo, nunca uma lista fixa.
   */
  used_by_model: boolean
}

export interface KeyAreaMeta {
  name: string
  label_pt: string
  n_sensors: number
}

export interface ArchitectureMeta {
  code: Architecture
  available: boolean
  label_pt: string
}

export interface SensorMeta {
  tc_number: number
  tc_name: string
  key_area: string
  active_limit_c: number | null
  is_monitor: boolean
  monitor_reference_c: number | null
}

/** Família de modelo disponível no conjunto de artefatos (v1.1). */
export interface AlgorithmMeta {
  code: AlgorithmCode
  label_pt: string
  /** `false` quando o artefato do algoritmo não pôde ser carregado. */
  available: boolean
  /** Versão do artefato deste algoritmo — distinta de `PredictionResponse.model_version`. */
  model_version: string
  /** Timestamp ISO-8601 do treino, quando o manifesto o registra. */
  trained_at?: string
}

/** Um ensaio de laboratório da área, usado como teste na validação LOGO. */
export interface ValidationRun {
  /**
   * Rótulo curto do ensaio, montado com as variáveis que mais o distinguem.
   * Serve para o tooltip identificar de qual ensaio veio o ponto.
   */
  label: string
}

/**
 * Um par previsto/real da validação LOGO: a temperatura que o laboratório
 * mediu e a que o modelo previu para **a mesma configuração**.
 *
 * São os únicos valores reais medidos que o produto tem. Uma configuração que
 * nunca foi ao laboratório não tem — e não pode ter — um "real" para comparar.
 */
export interface ValidationPoint {
  /** Coluna-alvo do modelo; pode cobrir vários termopares (IGBT fundido). */
  target: string
  /** Índice do ensaio em `AreaValidation.runs`. */
  run: number
  /**
   * Termopares cobertos por esta coluna — 16 no caso do IGBT fundido. É **um**
   * ponto, não 16: replicar a observação inventaria amostras independentes e
   * achataria as estatísticas de erro.
   */
  tc_numbers: number[]
  tc_name: string
  active_limit_c: number | null
  /** Temperatura medida em laboratório, em °C. */
  actual_c: number
  /** Temperatura prevista pelo modelo para a configuração do ensaio, em °C. */
  predicted_c: number
}

export interface AreaValidation {
  runs: ValidationRun[]
  points: ValidationPoint[]
}

/** Métricas de validação de uma área (v1.1) — `GET /api/v1/metrics`. */
export interface AreaMetrics {
  key_area: string
  /** Algoritmo que atende a área; vem junto porque comparar MAE entre áreas
   *  atendidas por modelos diferentes exige a procedência à vista. */
  algorithm: AlgorithmCode
  /** Erro absoluto médio, em °C. */
  mae: number
  /** Raiz do erro quadrático médio, em °C. */
  rmse: number
  /** Coeficiente de determinação no conjunto de validação. */
  r2: number
  /** Erro percentual absoluto médio, em %. */
  mape_pct: number
  /** Fração (0..1) das predições com erro ≤ 10 % — o KPI do projeto. */
  within_ten_pct_rate: number
  /** Importância das 7 variáveis de configuração; soma 1,0. */
  feature_importance: Record<string, number>
  /**
   * Pares previsto/real da validação LOGO desta área (v1.2). Alimentam a
   * dispersão e o mapa de calor da aba de métricas, que antes liam dado
   * simulado.
   */
  validation: AreaValidation
}

export interface MetricsResponse {
  /** Versão do conjunto de artefatos — mesma semântica de `PredictionResponse.model_version`. */
  model_version: string
  /** Uma linha por área pedida (ou todas, sem filtro). */
  areas: AreaMetrics[]
  generated_at: string
}

export interface Metadata {
  contract_version: string
  architectures: ArchitectureMeta[]
  variables: VariableMeta[]
  sensors: SensorMeta[]
  key_areas: KeyAreaMeta[]
  /** Configuração real do dataset, usada como preset inicial da demo. */
  reference_config: StoveConfig
  /** Famílias de modelo do conjunto de artefatos (v1.1). */
  algorithms: AlgorithmMeta[]
  /**
   * Mapeamento completo `key_area` → algoritmo (v1.1), servido pelo back-end a
   * partir do manifesto. **O front-end nunca duplica este mapa**: trocar o
   * algoritmo de uma área é edição de configuração, não deploy de interface.
   */
  area_algorithms: Record<string, AlgorithmCode>
}

/** Erro de violação do contrato (valor fora das opções canônicas, etc.). */
export class ContractError extends Error {
  readonly field: string
  readonly value: unknown

  constructor(message: string, field: string, value: unknown) {
    super(message)
    this.name = 'ContractError'
    this.field = field
    this.value = value
    Object.setPrototypeOf(this, ContractError.prototype)
  }
}

/** Interface de acesso a dados: `LocalMockSource` (Fase 1) e `ApiSource` (Fase 2). */
export interface PredictionSource {
  getMetadata(): Promise<Metadata>
  predict(req: PredictionRequest): Promise<PredictionResponse>
  /** Métricas de validação por área (v1.1); `areas` vazio/ausente = todas. */
  getMetrics(areas?: string[]): Promise<MetricsResponse>
}
