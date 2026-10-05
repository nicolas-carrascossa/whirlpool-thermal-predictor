/**
 * Derivações puras sobre os dados de métricas: status frente ao KPI, perfil de
 * erro por área (para o mapa de calor), domínio comum dos eixos da dispersão e
 * a classificação de status de um par previsto/real. Sem React aqui, para os
 * testes cobrirem a camada de dados sem depender da geometria do SVG.
 */

import { hexToRgb } from '@/components/thermal-map/colorScale'
import type {
  SensorPrediction,
  StoveConfig,
  ValidationPoint,
  VariableMeta,
} from '@/contract/v1'
import { statusOf, type SensorStatus } from '@/lib/status'

/** As 7 variáveis de configuração, na ordem do formulário. */
export const CONFIG_VARIABLES: (keyof StoveConfig)[] = [
  'blower_direction',
  'housing',
  'board_position',
  'run_case',
  'losses',
  'deflector_hole',
  'material_coil_support',
]

/** KPI do projeto: erro percentual máximo aceito (MAPE, em %). */
export const KPI_MAPE_LIMIT_PCT = 10
/** Faixa de atenção: a partir daqui a área está perto de estourar o KPI. */
export const KPI_MAPE_WARN_PCT = 8

export type KpiStatus = 'ok' | 'warn' | 'danger'

/** Situação da área frente ao KPI de erro ≤ 10 %, a partir do MAPE cru. */
export function kpiStatusForMape(mapePct: number): KpiStatus {
  if (mapePct > KPI_MAPE_LIMIT_PCT) return 'danger'
  if (mapePct > KPI_MAPE_WARN_PCT) return 'warn'
  return 'ok'
}

export const KPI_STATUS_LABEL_PT: Record<KpiStatus, string> = {
  ok: 'Dentro do KPI',
  warn: 'Próximo do limite',
  danger: 'Fora do KPI',
}

/** Colunas do mapa de calor: estatísticas do erro absoluto, todas em °C. */
export const ERROR_PROFILE_COLUMNS = [
  { key: 'mae', label: 'MAE' },
  { key: 'rmse', label: 'RMSE' },
  { key: 'median', label: 'Erro mediano' },
  { key: 'p90', label: 'Erro p90' },
  { key: 'max', label: 'Erro máximo' },
] as const

export type ErrorProfileKey = (typeof ERROR_PROFILE_COLUMNS)[number]['key']
export type ErrorProfile = Record<ErrorProfileKey, number>

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Perfil do erro absoluto (°C) calculado dos próprios pares previsto/real. */
export function errorProfileOf(points: ValidationPoint[]): ErrorProfile {
  const abs = points.map((p) => Math.abs(p.predicted_c - p.actual_c)).sort((a, b) => a - b)
  const n = abs.length
  const mae = n ? abs.reduce((s, e) => s + e, 0) / n : Number.NaN
  const rmse = n ? Math.sqrt(abs.reduce((s, e) => s + e * e, 0) / n) : Number.NaN
  return {
    mae,
    rmse,
    median: quantile(abs, 0.5),
    p90: quantile(abs, 0.9),
    max: n ? abs[n - 1] : Number.NaN,
  }
}

/**
 * Domínio único para os dois eixos da dispersão: começa e termina no mesmo
 * valor em X e Y, com folga de 5 % e arredondado a múltiplos de 10 °C, para a
 * reta y = x cortar o gráfico na diagonal exata.
 */
export function equalAxisDomain(points: ValidationPoint[]): [number, number] {
  if (points.length === 0) return [0, 100]
  const values = points.flatMap((p) => [p.actual_c, p.predicted_c])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.05
  return [Math.floor((min - pad) / 10) * 10, Math.ceil((max + pad) / 10) * 10]
}

/**
 * Status de um par pela mesma regra do resto da app (`statusOf`): a temperatura
 * PREVISTA é comparada ao limite do sensor. Sem limite, é `monitor`.
 */
export function statusForPoint(point: ValidationPoint): SensorStatus {
  const limit = point.active_limit_c
  const prediction: SensorPrediction = {
    tc_number: point.tc_numbers[0] ?? 0,
    tc_name: point.tc_name,
    key_area: '',
    temp_c: point.predicted_c,
    error_margin_c: 0,
    error_margin_pct: 0,
    active_limit_c: limit,
    exceeds_limit: limit !== null && point.predicted_c > limit,
    limit_ratio: limit !== null && limit > 0 ? point.predicted_c / limit : null,
    is_monitor: limit === null,
    monitor_reference_c: null,
    reliability: 'interpolation',
    // Objeto sintético só para reaproveitar `statusOf`: o algoritmo não entra
    // na regra de status, e esta função não conhece a área do ponto.
    algorithm: 'random_forest',
  }
  return statusOf(prediction)
}

/**
 * Recorta os pares de validação aos termopares que a consulta realmente
 * devolveu. Sem isso, a dispersão de uma consulta de 4 sensores mostraria os
 * 10 da área — números reais, mas respondendo a outra pergunta.
 *
 * Um ponto entra se QUALQUER termopar que ele cobre está no recorte: a coluna
 * fundida do IGBT cobre 16, e pedir um deles é pedir aquela coluna.
 */
export function scopeToPrediction(
  points: ValidationPoint[],
  tcNumbers: Set<number> | undefined,
): ValidationPoint[] {
  if (!tcNumbers?.size) return points
  return points.filter((p) => p.tc_numbers.some((n) => tcNumbers.has(n)))
}

/**
 * Índice do ensaio de teste cuja configuração é a que o usuário acabou de
 * consultar — ou `null` quando a consulta não corresponde a nenhum ensaio.
 *
 * A identificação é por IGUALDADE NUMÉRICA, não por comparação de configuração:
 * mesmo modelo e mesma entrada produzem exatamente a mesma saída, então um
 * ensaio cujos `predicted_c` batem, sensor a sensor, com a predição exibida é o
 * mesmo ponto no espaço de configuração. Isso evita duplicar no front a
 * tradução entre a grafia canônica do contrato e a grafia de treino, que é
 * justamente onde essa comparação erraria em silêncio.
 *
 * Exige que TODOS os pontos do ensaio batam. Um único sensor coincidir por
 * acaso é plausível; a área inteira coincidir sem ser a mesma entrada, não.
 */
export function executedRunIndex(
  points: ValidationPoint[],
  predictedByTc: Map<number, number>,
): number | null {
  if (predictedByTc.size === 0) return null
  const byRun = new Map<number, ValidationPoint[]>()
  for (const point of points) {
    const list = byRun.get(point.run)
    if (list) list.push(point)
    else byRun.set(point.run, [point])
  }
  for (const [run, runPoints] of byRun) {
    const comparable = runPoints.filter((p) =>
      p.tc_numbers.some((n) => predictedByTc.has(n)),
    )
    if (comparable.length === 0) continue
    const allMatch = comparable.every((p) => {
      const tc = p.tc_numbers.find((n) => predictedByTc.has(n))
      return tc !== undefined && predictedByTc.get(tc) === p.predicted_c
    })
    if (allMatch) return run
  }
  return null
}

/** Luminância relativa (WCAG) de uma cor `#rrggbb`. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Cor de texto legível sobre o fundo: branco em fundos escuros, cinza-85 em claros. */
export function textColorForBackground(hex: string): string {
  return relativeLuminance(hex) > 0.4 ? 'var(--wp-gray-85)' : 'var(--wp-white)'
}

/** Mesmo texto do badge do painel de configuração. */
export const NOT_USED_LABEL_PT = 'informativo — não usado pelo modelo'

export interface ImportanceDatum {
  name: keyof StoveConfig
  label: string
  importance: number
  usedByModel: boolean
  /** Texto exibido ao lado das barras zeradas. */
  note: string
}

export function importanceData(
  importance: Record<string, number>,
  variables: VariableMeta[] | undefined,
): ImportanceDatum[] {
  const meta = new Map((variables ?? []).map((v) => [v.name, v]))
  return CONFIG_VARIABLES.map((name) => {
    const v = meta.get(name)
    const usedByModel = v?.used_by_model ?? (importance[name] ?? 0) > 0
    return {
      name,
      label: v?.label_pt ?? name,
      importance: importance[name] ?? 0,
      usedByModel,
      note: usedByModel ? '' : NOT_USED_LABEL_PT,
    }
  }).sort((a, b) => b.importance - a.importance)
}

/**
 * Matriz de decisão contra o limite de engenharia.
 *
 * "Positivo" é APROVAR (previsto dentro do limite). Assim FP é o erro grave —
 * o modelo aprovou algo que na medição excede — e FN é só uma simulação CFD
 * a mais. A regra é a simples `previsto > limite`, sem margem de segurança.
 */
export interface ConfusionCounts {
  /** Aprovou e estava dentro do limite. */
  tp: number
  /** Aprovou, mas a medição excede o limite. */
  fp: number
  /** Reprovou, mas a medição estava dentro do limite. */
  fn: number
  /** Reprovou e a medição excede o limite. */
  tn: number
}

export const EMPTY_CONFUSION: ConfusionCounts = { tp: 0, fp: 0, fn: 0, tn: 0 }

function tally(counts: ConfusionCounts, predictedExceeds: boolean, actualExceeds: boolean) {
  if (!predictedExceeds && !actualExceeds) counts.tp += 1
  else if (!predictedExceeds && actualExceeds) counts.fp += 1
  else if (predictedExceeds && !actualExceeds) counts.fn += 1
  else counts.tn += 1
}

/** Nível 1: uma observação por leitura (ensaio × coluna-alvo). Sem limite, fica de fora. */
export function confusionByReading(points: ValidationPoint[]): ConfusionCounts {
  const counts = { ...EMPTY_CONFUSION }
  for (const p of points) {
    const limit = p.active_limit_c
    if (limit === null) continue
    tally(counts, p.predicted_c > limit, p.actual_c > limit)
  }
  return counts
}

/**
 * Nível 2: uma observação por design (ensaio). O design excede se QUALQUER
 * sensor com limite excede — na medição para o real, na previsão para o
 * previsto. Um design sem nenhum sensor com limite fica de fora.
 */
export function confusionByDesign(points: ValidationPoint[]): ConfusionCounts {
  const byRun = new Map<number, { predicted: boolean; actual: boolean }>()
  for (const p of points) {
    const limit = p.active_limit_c
    if (limit === null) continue
    const run = byRun.get(p.run) ?? { predicted: false, actual: false }
    run.predicted ||= p.predicted_c > limit
    run.actual ||= p.actual_c > limit
    byRun.set(p.run, run)
  }
  const counts = { ...EMPTY_CONFUSION }
  for (const run of byRun.values()) tally(counts, run.predicted, run.actual)
  return counts
}

/** Total de excedências reais (FP + TN): o denominador que importa para o FP. */
export function actualExceedances(c: ConfusionCounts): number {
  return c.fp + c.tn
}

export function addConfusion(a: ConfusionCounts, b: ConfusionCounts): ConfusionCounts {
  return { tp: a.tp + b.tp, fp: a.fp + b.fp, fn: a.fn + b.fn, tn: a.tn + b.tn }
}

/** Célula (tp/fp/fn/tn) de uma única observação, a partir das contagens dela. */
export function singleOutcome(c: ConfusionCounts): keyof ConfusionCounts | null {
  const hit = (['tp', 'fp', 'fn', 'tn'] as const).filter((k) => c[k] > 0)
  return hit.length === 1 ? hit[0] : null
}

export interface ConfigurationAreaResult {
  keyArea: string
  /** `true` quando a configuração consultada é um ensaio de TESTE desta área. */
  hasTestRun: boolean
  readings: ConfusionCounts
  /** O ensaio desta área como um design: no máximo uma observação. */
  design: ConfusionCounts
}

export interface ConfigurationDecision {
  areas: ConfigurationAreaResult[]
  /** Soma por leitura das áreas que têm ensaio de teste. */
  readings: ConfusionCounts
  /** Quantas áreas do recorte têm essa configuração no teste. */
  coveredAreas: number
  /** Veredito do design inteiro: reprova/excede se QUALQUER área coberta o faz. */
  design: ConfusionCounts
}

/**
 * Matriz da CONFIGURAÇÃO consultada. Só entra a área em que a configuração é um
 * ensaio de teste (o modelo não a viu no treino); nas demais não há comparação
 * honesta e a área fica marcada como sem ensaio. Cada área tem seu próprio
 * modelo, então o resultado soma respostas de modelos diferentes.
 */
export function configurationDecision(
  areas: { keyArea: string; points: ValidationPoint[] }[],
  predictedByTc: Map<number, number>,
): ConfigurationDecision {
  const tcNumbers = new Set(predictedByTc.keys())
  const results: ConfigurationAreaResult[] = areas.map(({ keyArea, points }) => {
    const run = executedRunIndex(scopeToPrediction(points, tcNumbers), predictedByTc)
    if (run === null) {
      return { keyArea, hasTestRun: false, readings: { ...EMPTY_CONFUSION }, design: { ...EMPTY_CONFUSION } }
    }
    const runPoints = points.filter((p) => p.run === run)
    return {
      keyArea,
      hasTestRun: true,
      readings: confusionByReading(runPoints),
      design: confusionByDesign(runPoints),
    }
  })
  const covered = results.filter((r) => r.hasTestRun)
  const readings = covered.reduce((acc, r) => addConfusion(acc, r.readings), { ...EMPTY_CONFUSION })
  const areaDesigns = covered.reduce((acc, r) => addConfusion(acc, r.design), { ...EMPTY_CONFUSION })
  const design = { ...EMPTY_CONFUSION }
  if (covered.length > 0) {
    tally(design, areaDesigns.fn + areaDesigns.tn > 0, areaDesigns.fp + areaDesigns.tn > 0)
  }
  return { areas: results, readings, coveredAreas: covered.length, design }
}
