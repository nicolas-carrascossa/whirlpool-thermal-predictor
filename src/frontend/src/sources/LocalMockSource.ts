/**
 * `LocalMockSource` — implementação de `PredictionSource` que roda inteiramente
 * no navegador, a partir dos três JSONs gerados por `scripts/build_registry.py`.
 *
 * Não é um modelo: é um gerador determinístico calibrado pelas estatísticas
 * reais do dataset e pelos sinais das hipóteses H1, H3 e H4. Serve para
 * demonstrar o produto sem API e para dar um alvo estável aos testes de
 * contrato. Será substituído por `ApiSource` (Fase 2) sem mudança de tela.
 */

import { KEY_AREA_COPY, VARIABLE_COPY } from '@/contract/glossary_copy'
import {
  type AlgorithmCode,
  type AreaValidation,
  type MetricsResponse,
  CONTRACT_VERSION,
  ContractError,
  type Architecture,
  type Metadata,
  type PredictionRequest,
  type PredictionResponse,
  type PredictionSource,
  type Reliability,
  type SensorPrediction,
  type StoveConfig,
} from '@/contract/v1'
import modelManifestJson from '@data/model_manifest.json'
import registryJson from '@data/sensor_registry.json'
import statsJson from '@data/sensor_stats.json'
import variableOptionsJson from '@data/variable_options.json'

export const MODEL_VERSION = 'mock-0.1.0'

/**
 * Manifesto dos modelos (gerado por `scripts/export_models.py`). O mock não
 * roda modelo nenhum, mas ecoa daqui o mapeamento área → algoritmo e as
 * métricas, para que o modo local exercite exatamente o mesmo caminho de
 * código da API — e para que o mapa não seja escrito à mão em lugar nenhum.
 */
const MANIFEST = modelManifestJson as {
  model_set_version: string
  trained_at: string
  area_algorithms: Record<string, AlgorithmCode>
  algorithms: Record<string, { code: AlgorithmCode; label_pt: string; model_version: string; trained_at?: string }>
  metrics_by_area: Record<
    string,
    {
      algorithm: AlgorithmCode
      mae: number
      rmse: number
      r2: number
      mape_pct: number
      within_ten_pct_rate: number
      feature_importance: Record<string, number>
      validation: AreaValidation
    }
  >
}

/** Algoritmo que atende a área, sempre vindo do manifesto. */
function algorithmForArea(keyArea: string): AlgorithmCode {
  return MANIFEST.area_algorithms[keyArea] ?? 'random_forest'
}

/** Campos aceitos no contrato mas deliberadamente fora do modelo (H2). */
export const IGNORED_FIELDS = ['losses', 'board_position'] as const

/** As 7 colunas de configuração, na ordem canônica usada para hash e validação. */
export const CONFIG_FIELDS = [
  'blower_direction',
  'housing',
  'board_position',
  'run_case',
  'losses',
  'deflector_hole',
  'material_coil_support',
] as const

/** As 5 variáveis que o modelo (mock e real) efetivamente usa. */
export const MODEL_FIELDS = [
  'blower_direction',
  'housing',
  'run_case',
  'deflector_hole',
  'material_coil_support',
] as const

type ConfigField = (typeof CONFIG_FIELDS)[number]

interface SensorRow {
  tc_number: number
  tc_name: string
  key_area: string
  active_limit_c: number | null
  is_monitor: boolean
  monitor_reference_c: number | null
}

interface SensorStat {
  n: number
  mean: number
  std: number
  min: number
  max: number
  by_run_case: Record<string, { n: number; mean: number; std: number }>
}

const SENSORS = registryJson as SensorRow[]
const PER_SENSOR = statsJson.per_sensor as unknown as Record<string, SensorStat>
const RUN_CONFIGS = statsJson.run_configs as unknown as Array<
  Partial<Record<ConfigField, string | null>> & { run_id: string }
>
const VARIABLE_OPTIONS = variableOptionsJson as unknown as Record<
  string,
  { name: string; options: string[] }
>

/** Ordem estável dos sensores: garante que o ruído independe do filtro de alvos. */
const SENSOR_ORDER = [...SENSORS].sort((a, b) => a.tc_number - b.tc_number)

const KEY_AREAS = SENSOR_ORDER.reduce<string[]>((acc, s) => {
  if (!acc.includes(s.key_area)) acc.push(s.key_area)
  return acc
}, [])

// ---------------------------------------------------------------------------
// Determinismo: hash FNV-1a 32 bits + PRNG mulberry32
// ---------------------------------------------------------------------------

export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Serialização canônica da config completa (ordem fixa de campos). */
export function canonicalConfigKey(config: StoveConfig): string {
  return CONFIG_FIELDS.map((f) => `${f}=${config[f]}`).join('|')
}

/**
 * Serialização canônica apenas das variáveis usadas pelo modelo. É esta chave
 * que alimenta a semente, de modo que mudar `losses` ou `board_position` não
 * altera nenhuma predição (H2).
 */
export function canonicalModelKey(config: StoveConfig): string {
  return MODEL_FIELDS.map((f) => `${f}=${config[f]}`).join('|')
}

// ---------------------------------------------------------------------------
// Confiabilidade
// ---------------------------------------------------------------------------

/**
 * Distância de Hamming mínima entre a config consultada e as combinações do
 * conjunto de treino, considerando apenas as 5 variáveis do modelo.
 * Exposto separadamente do contrato para permitir testes e diagnóstico.
 */
export function computeReliability(config: StoveConfig): {
  distance: number
  reliability: Reliability
  closest_run_id: string | null
} {
  let best: number = MODEL_FIELDS.length
  let bestRun: string | null = null
  for (const run of RUN_CONFIGS) {
    let d = 0
    for (const field of MODEL_FIELDS) {
      if (run[field] !== config[field]) d += 1
    }
    if (d < best) {
      best = d
      bestRun = run.run_id
      if (d === 0) break
    }
  }
  const reliability: Reliability =
    best === 0 ? 'interpolation' : best === 1 ? 'moderate_extrapolation' : 'out_of_domain'
  return { distance: best, reliability, closest_run_id: bestRun }
}

// ---------------------------------------------------------------------------
// Configuração de referência: combinação das 7 variáveis mais frequente no dataset
// ---------------------------------------------------------------------------

function pickReferenceConfig(): StoveConfig {
  const counts = new Map<string, { n: number; config: StoveConfig }>()
  for (const run of RUN_CONFIGS) {
    if (CONFIG_FIELDS.some((f) => typeof run[f] !== 'string')) continue
    const config = Object.fromEntries(
      CONFIG_FIELDS.map((f) => [f, run[f] as string]),
    ) as unknown as StoveConfig
    const key = canonicalConfigKey(config)
    const entry = counts.get(key)
    if (entry) entry.n += 1
    else counts.set(key, { n: 1, config })
  }
  // Empate desfeito pela ordem lexicográfica da chave canônica, para que a
  // configuração de referência seja estável entre execuções.
  const ranked = [...counts.entries()].sort((a, b) =>
    b[1].n !== a[1].n ? b[1].n - a[1].n : a[0].localeCompare(b[0]),
  )
  const best = ranked.length > 0 ? ranked[0][1] : null
  if (!best) throw new ContractError('Nenhuma configuração de referência disponível.', 'config', null)
  return best.config
}

export const REFERENCE_CONFIG: StoveConfig = pickReferenceConfig()

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export function validateConfig(config: StoveConfig): void {
  if (!config || typeof config !== 'object') {
    throw new ContractError('Configuração ausente ou inválida.', 'config', config)
  }
  for (const field of CONFIG_FIELDS) {
    const value = config[field]
    const options = VARIABLE_OPTIONS[field]?.options ?? []
    if (typeof value !== 'string') {
      throw new ContractError(
        `O campo "${field}" é obrigatório e deve ser um texto.`,
        field,
        value,
      )
    }
    if (!options.includes(value)) {
      throw new ContractError(
        `Valor inválido para "${field}": "${value}". Valores aceitos: ${options.join(', ')}.`,
        field,
        value,
      )
    }
  }
}

function validateArchitecture(architecture: unknown): asserts architecture is Architecture {
  if (architecture !== 'BR' && architecture !== 'MX') {
    throw new ContractError(
      `Arquitetura inválida: "${String(architecture)}". Valores aceitos: BR, MX.`,
      'architecture',
      architecture,
    )
  }
}

// ---------------------------------------------------------------------------
// Ajustes multiplicativos por área, coerentes com as hipóteses
// ---------------------------------------------------------------------------

/**
 * Fator multiplicativo aplicado à média histórica do sensor.
 * H4: carcaça aberta aquece a eletrônica de potência.
 * H1: o furo do defletor redistribui calor (não reduz o total).
 */
export function areaMultiplier(config: StoveConfig, keyArea: string): number {
  let m = 1

  // housing (H4) — aberto aquece IPC, esfria levemente o resto
  if (config.housing === 'Open' || config.housing === 'Open - Updated') {
    const gain = config.housing === 'Open' ? 1.08 : 1.06
    m *= keyArea === 'IPC Comp' || keyArea === 'IPC Cooling' ? gain : 0.98
  }

  // deflector_hole (H1, documentacao.md §H1) — abrir aquece a área do IPC e
  // resfria a ventilação principal; o total não muda, só redistribui
  if (config.deflector_hole === 'Open') {
    if (keyArea === 'IPC Comp' || keyArea === 'IPC Cooling' || keyArea === 'Oven HMI') m *= 1.05
    else if (keyArea === 'Main Vent Sys' || keyArea === 'Mainback') m *= 0.95
  }

  // blower_direction (documentacao.md §H1) — "To back" piora as duas áreas
  // eletrônicas sem aliviar nenhuma outra: condição pior em termos absolutos
  if (config.blower_direction === 'To back') {
    if (keyArea === 'IPC Comp' || keyArea === 'IPC Cooling') m *= 1.05
  }

  // material_coil_support — condução na região das resistências
  if (keyArea === 'Coil Temps') {
    if (config.material_coil_support === 'Plastic') m *= 1.04
    else if (config.material_coil_support === 'Aluminium Plate') m *= 0.98
  }

  // losses e board_position: nenhum efeito (H2).
  return m
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export interface LocalMockSourceOptions {
  /** Relógio injetável — os testes fixam para comparar respostas por igualdade. */
  now?: () => Date
}

export class LocalMockSource implements PredictionSource {
  private readonly now: () => Date

  constructor(options: LocalMockSourceOptions = {}) {
    this.now = options.now ?? (() => new Date())
  }

  async getMetadata(): Promise<Metadata> {
    return {
      contract_version: CONTRACT_VERSION,
      architectures: [
        { code: 'BR', available: true, label_pt: 'Brasil' },
        { code: 'MX', available: false, label_pt: 'México (sem dados de treino)' },
      ],
      variables: CONFIG_FIELDS.map((name) => ({
        name,
        label_pt: VARIABLE_COPY[name]?.label_pt ?? name,
        help_pt: VARIABLE_COPY[name]?.help_pt ?? '',
        options: VARIABLE_OPTIONS[name]?.options ?? [],
        used_by_model: !(IGNORED_FIELDS as readonly string[]).includes(name),
      })),
      sensors: SENSOR_ORDER.map((s) => ({
        tc_number: s.tc_number,
        tc_name: s.tc_name,
        key_area: s.key_area,
        active_limit_c: s.active_limit_c,
        is_monitor: s.is_monitor,
        monitor_reference_c: s.monitor_reference_c,
      })),
      key_areas: KEY_AREAS.map((name) => ({
        name,
        label_pt: KEY_AREA_COPY[name]?.label_pt ?? name,
        n_sensors: SENSOR_ORDER.filter((s) => s.key_area === name).length,
      })),
      reference_config: { ...REFERENCE_CONFIG },
      algorithms: Object.values(MANIFEST.algorithms).map((a) => ({
        code: a.code,
        label_pt: a.label_pt,
        // No modo local nenhum artefato é carregado: a procedência é exibida,
        // mas o modelo em si não está disponível.
        available: false,
        model_version: a.model_version,
        trained_at: a.trained_at,
      })),
      area_algorithms: { ...MANIFEST.area_algorithms },
    }
  }

  async getMetrics(areas?: string[]): Promise<MetricsResponse> {
    const wanted = Object.keys(MANIFEST.metrics_by_area).filter(
      (area) => !areas?.length || areas.includes(area),
    )
    return {
      model_version: MANIFEST.model_set_version,
      areas: wanted.map((keyArea) => {
        const m = MANIFEST.metrics_by_area[keyArea]
        return {
          key_area: keyArea,
          algorithm: m.algorithm,
          mae: m.mae,
          rmse: m.rmse,
          r2: m.r2,
          mape_pct: m.mape_pct,
          within_ten_pct_rate: m.within_ten_pct_rate,
          feature_importance: m.feature_importance,
          // Pares previsto/real REAIS, medidos em laboratório, mesmo offline:
          // o manifesto os carrega. O mock simula a predição de uma config
          // nova, nunca a validação — esta não tem por que ser inventada.
          validation: m.validation,
        }
      }),
      generated_at: this.now().toISOString(),
    }
  }

  async predict(req: PredictionRequest): Promise<PredictionResponse> {
    validateArchitecture(req?.architecture)
    validateConfig(req?.config)

    const seed = fnv1a(`${req.architecture}|${canonicalModelKey(req.config)}`)
    const requestId = `req-${fnv1a(`${req.architecture}|${canonicalConfigKey(req.config)}|${JSON.stringify(req.targets ?? {})}`)
      .toString(16)
      .padStart(8, '0')}`

    const base: PredictionResponse = {
      request_id: requestId,
      model_version: MODEL_VERSION,
      architecture: req.architecture,
      architecture_available: req.architecture === 'BR',
      ignored_fields: [...IGNORED_FIELDS],
      predictions: [],
      algorithm_by_area: {},
      generated_at: this.now().toISOString(),
    }

    if (!base.architecture_available) return base

    const { reliability } = computeReliability(req.config)
    const rand = mulberry32(seed)

    const wantedAreas = req.targets?.key_areas ?? []
    const wantedSensors = req.targets?.sensors ?? []
    const filtering = wantedAreas.length > 0 || wantedSensors.length > 0

    const predictions: SensorPrediction[] = []
    for (const sensor of SENSOR_ORDER) {
      const stat = PER_SENSOR[String(sensor.tc_number)]
      // O ruído é consumido para TODOS os sensores, na ordem fixa, de modo que
      // filtrar alvos não altera os valores dos sensores retornados.
      const noiseUnit = rand() * 2 - 1
      if (!stat) continue

      const included = !filtering
        ? true
        : wantedAreas.includes(sensor.key_area) || wantedSensors.includes(sensor.tc_number)
      if (!included) continue

      const baseTemp = stat.by_run_case?.[req.config.run_case]?.mean ?? stat.mean
      const adjusted = baseTemp * areaMultiplier(req.config, sensor.key_area)
      const noisy = adjusted + noiseUnit * 0.25 * stat.std
      const tempC = round2(Math.min(Math.max(noisy, stat.min * 0.9), stat.max * 1.1))

      const errorMarginC = round2(Math.max(0.5 * stat.std, 1))
      const errorMarginPct = round2(tempC > 0 ? (errorMarginC / tempC) * 100 : 0)

      const limit = sensor.active_limit_c
      const hasLimit = typeof limit === 'number'

      predictions.push({
        tc_number: sensor.tc_number,
        tc_name: sensor.tc_name,
        key_area: sensor.key_area,
        temp_c: tempC,
        error_margin_c: errorMarginC,
        error_margin_pct: errorMarginPct,
        active_limit_c: hasLimit ? limit : null,
        exceeds_limit: hasLimit ? tempC > limit : false,
        limit_ratio: hasLimit ? round2(tempC / limit) : null,
        is_monitor: sensor.is_monitor,
        monitor_reference_c: sensor.monitor_reference_c,
        reliability,
        algorithm: algorithmForArea(sensor.key_area),
      })
    }

    const algorithmByArea: Record<string, AlgorithmCode> = {}
    for (const p of predictions) algorithmByArea[p.key_area] = p.algorithm

    return { ...base, predictions, algorithm_by_area: algorithmByArea }
  }
}
