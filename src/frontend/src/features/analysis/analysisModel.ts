/**
 * Cálculos da análise técnica de uma área: comparação com uma base,
 * variáveis alteradas e sensibilidade. Só funções puras: quem busca dados é o
 * `AnalysisPanel`.
 */

import type {
  Metadata,
  Reliability,
  SensorPrediction,
  StoveConfig,
  VariableMeta,
} from '@/contract/v1'
import { HIDDEN_OPTIONS } from '@/features/config/variableLabels'

// ---------------------------------------------------------------- 1. Δ vs. base

export interface SensorDelta {
  tcNumber: number
  name: string
  base: number
  current: number
  /** atual − base, em °C. */
  delta: number
}

/** Δ por sensor entre a consulta e a base; só sensores presentes nas duas respostas. */
export function sensorDeltas(
  current: SensorPrediction[],
  base: SensorPrediction[],
  keyArea?: string,
): SensorDelta[] {
  const ref = new Map(base.map((p) => [p.tc_number, p]))
  const rows: SensorDelta[] = []
  for (const p of current) {
    if (keyArea && p.key_area !== keyArea) continue
    const r = ref.get(p.tc_number)
    if (!r) continue
    rows.push({
      tcNumber: p.tc_number,
      name: p.tc_name,
      base: r.temp_c,
      current: p.temp_c,
      delta: p.temp_c - r.temp_c,
    })
  }
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.tcNumber - b.tcNumber)
}

export interface AreaDelta {
  keyArea: string
  n: number
  /** Δ médio entre os sensores da área. */
  meanDelta: number
  /** Sensor com o maior |Δ|. */
  peak: SensorDelta
}

/** Resumo do Δ por área, da que mais se moveu para a que menos. */
export function areaDeltas(current: SensorPrediction[], base: SensorPrediction[]): AreaDelta[] {
  const areas = [...new Set(current.map((p) => p.key_area))]
  const out: AreaDelta[] = []
  for (const keyArea of areas) {
    const rows = sensorDeltas(current, base, keyArea)
    if (rows.length === 0) continue
    out.push({
      keyArea,
      n: rows.length,
      meanDelta: rows.reduce((sum, r) => sum + r.delta, 0) / rows.length,
      peak: rows[0],
    })
  }
  return out.sort((a, b) => Math.abs(b.peak.delta) - Math.abs(a.peak.delta) || a.keyArea.localeCompare(b.keyArea))
}

// ---------------------------------------------------------------- 2. Variáveis alteradas

export interface ChangedVariable {
  name: keyof StoveConfig
  from: string
  to: string
  /** Importância da variável no modelo da área (0..1); `null` se o modelo não a informa. */
  importance: number | null
  usedByModel: boolean
}

/** Variáveis em que a consulta difere da base, da mais para a menos influente na área. */
export function changedVariables(
  config: StoveConfig,
  base: StoveConfig,
  variables: VariableMeta[],
  importance: Record<string, number> | undefined,
): ChangedVariable[] {
  const out: ChangedVariable[] = []
  for (const v of variables) {
    const name = v.name as keyof StoveConfig
    if (config[name] === base[name]) continue
    out.push({
      name,
      from: base[name],
      to: config[name],
      importance: importance?.[v.name] ?? null,
      usedByModel: v.used_by_model,
    })
  }
  return out.sort((a, b) => (b.importance ?? -1) - (a.importance ?? -1) || a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------- 3. Sensibilidade

export interface SensitivityCase {
  variable: keyof StoveConfig
  /** Valor atual da variável. */
  from: string
  /** Alternativa avaliada. */
  to: string
  /** Configuração completa com só esta variável trocada. */
  config: StoveConfig
}

/**
 * Uma entrada por (variável, alternativa): a configuração atual com UMA
 * variável trocada. Opções que os modelos unificam (`HIDDEN_OPTIONS`) ficam de fora,
 * como no painel de configuração.
 */
export function sensitivityCases(config: StoveConfig, metadata: Pick<Metadata, 'variables'>): SensitivityCase[] {
  const cases: SensitivityCase[] = []
  for (const v of metadata.variables) {
    const name = v.name as keyof StoveConfig
    const hidden = HIDDEN_OPTIONS[name] ?? []
    for (const option of v.options) {
      if (option === config[name] || hidden.includes(option)) continue
      cases.push({ variable: name, from: config[name], to: option, config: { ...config, [name]: option } })
    }
  }
  return cases
}

export interface SensitivityRow {
  variable: keyof StoveConfig
  from: string
  to: string
  /** Sensor em que o efeito foi medido (no modo "pico", o que mais se moveu). */
  sensor: string
  /** Variação nesse sensor: temperatura com a troca − temperatura atual, em °C. */
  delta: number
  /** Confiabilidade da previsão com a troca (pior entre os sensores da área). */
  reliability: Reliability
}

const RELIABILITY_RANK: Record<Reliability, number> = {
  interpolation: 0,
  moderate_extrapolation: 1,
  out_of_domain: 2,
}

export function worstReliability(predictions: SensorPrediction[]): Reliability {
  return predictions.reduce<Reliability>(
    (worst, p) => (RELIABILITY_RANK[p.reliability] > RELIABILITY_RANK[worst] ? p.reliability : worst),
    'interpolation',
  )
}

/**
 * Sensor-âncora da área: o de maior razão temp/limite; sem limite, o mais quente.
 * Fixar um sensor deixa os Δ comparáveis entre as alternativas.
 */
export function anchorSensor(predictions: SensorPrediction[]): SensorPrediction | null {
  let best: SensorPrediction | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const p of predictions) {
    const score =
      p.active_limit_c !== null && p.active_limit_c > 0 ? p.temp_c / p.active_limit_c + 1000 : p.temp_c
    if (score > bestScore) {
      best = p
      bestScore = score
    }
  }
  return best
}

/** Ordena do maior efeito (em módulo) para o menor. */
export function rankSensitivity(rows: SensitivityRow[]): SensitivityRow[] {
  return [...rows].sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.variable.localeCompare(b.variable) || a.to.localeCompare(b.to),
  )
}

/** Onde medir o efeito da troca: no sensor que mais se move na área ('peak') ou em um termopar fixo. */
export type SensitivityTarget = 'peak' | number

/**
 * Efeito de uma troca na área: com `'peak'`, o sensor de maior |Δ|; com um
 * número, o Δ naquele termopar. `null` se o sensor não está em uma das respostas.
 */
export function sensitivityEffect(
  base: SensorPrediction[],
  alternative: SensorPrediction[],
  target: SensitivityTarget,
): { sensor: string; delta: number } | null {
  const alt = new Map(alternative.map((p) => [p.tc_number, p]))
  let best: { sensor: string; delta: number } | null = null
  for (const b of base) {
    if (target !== 'peak' && b.tc_number !== target) continue
    const a = alt.get(b.tc_number)
    if (!a) continue
    const delta = a.temp_c - b.temp_c
    if (best === null || Math.abs(delta) > Math.abs(best.delta)) best = { sensor: b.tc_name, delta }
  }
  return best
}
