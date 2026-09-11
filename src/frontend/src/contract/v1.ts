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

export const CONTRACT_VERSION = '1.0.0'

/** Arquitetura de produto. Hoje só BR possui dados de treino. */
export type Architecture = 'BR' | 'MX'

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
  /** Posição da placa eletrônica. Ignorada pelo modelo (H2). */
  board_position: string
  /** Modo de operação simulado. */
  run_case: string
  /** Perfil de perdas térmicas assumido na simulação. Ignorado pelo modelo (H2). */
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
 * consultada e as combinações presentes no conjunto de treino, considerando
 * apenas as 5 variáveis usadas pelo modelo.
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
}

export interface PredictionResponse {
  /** Identificador determinístico da consulta (mesma request → mesmo id). */
  request_id: string
  /** Versão do preditor que gerou a resposta (ex.: "mock-0.1.0"). */
  model_version: string
  architecture: Architecture
  /** `false` quando não há modelo treinado para a arquitetura pedida. */
  architecture_available: boolean
  /** Campos da config recebidos e deliberadamente ignorados pelo modelo. */
  ignored_fields: string[]
  /** Vazio quando `architecture_available` é `false`. */
  predictions: SensorPrediction[]
  /** Timestamp ISO-8601 da geração. */
  generated_at: string
}

export interface VariableMeta {
  name: string
  label_pt: string
  help_pt: string
  options: string[]
  /** `false` para `losses` e `board_position` (excluídos pela H2). */
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

export interface Metadata {
  contract_version: string
  architectures: ArchitectureMeta[]
  variables: VariableMeta[]
  sensors: SensorMeta[]
  key_areas: KeyAreaMeta[]
  /** Configuração real do dataset, usada como preset inicial da demo. */
  reference_config: StoveConfig
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
}
