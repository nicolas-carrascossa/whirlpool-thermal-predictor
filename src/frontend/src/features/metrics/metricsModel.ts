/**
 * Derivações puras sobre os dados de métricas: status frente ao KPI, perfil de
 * erro por área (para o mapa de calor), domínio comum dos eixos da dispersão e
 * a classificação de status de um par previsto/real. Sem React aqui, para os
 * testes cobrirem a camada de dados sem depender da geometria do SVG.
 */

import { hexToRgb } from '@/components/thermal-map/colorScale'
import type { SensorPrediction, StoveConfig, VariableMeta } from '@/contract/v1'
import { statusOf, type SensorStatus } from '@/lib/status'

import {
  CONFIG_VARIABLES,
  KPI_MAPE_LIMIT_PCT,
  KPI_MAPE_WARN_PCT,
  type ErrorMetrics,
  type FeatureImportance,
  type PredictedVsActualPoint,
} from './mockMetrics'

export type KpiStatus = 'ok' | 'warn' | 'danger'

/** Situação da área frente ao KPI de erro ≤ 10 %. */
export function kpiStatusOf(metrics: ErrorMetrics): KpiStatus {
  if (metrics.mapePct > KPI_MAPE_LIMIT_PCT) return 'danger'
  if (metrics.mapePct > KPI_MAPE_WARN_PCT) return 'warn'
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
export function errorProfileOf(points: PredictedVsActualPoint[]): ErrorProfile {
  const abs = points.map((p) => Math.abs(p.predicted - p.actual)).sort((a, b) => a - b)
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
export function equalAxisDomain(points: PredictedVsActualPoint[]): [number, number] {
  if (points.length === 0) return [0, 100]
  const values = points.flatMap((p) => [p.actual, p.predicted])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.05
  return [Math.floor((min - pad) / 10) * 10, Math.ceil((max + pad) / 10) * 10]
}

/**
 * Status de um par pela mesma regra do resto da app (`statusOf`): a temperatura
 * PREVISTA é comparada ao limite do sensor. Sem limite, é `monitor`.
 */
export function statusForPoint(point: PredictedVsActualPoint): SensorStatus {
  const limit = point.activeLimitC
  const prediction: SensorPrediction = {
    tc_number: point.tcNumber,
    tc_name: point.tcName,
    key_area: '',
    temp_c: point.predicted,
    error_margin_c: 0,
    error_margin_pct: 0,
    active_limit_c: limit,
    exceeds_limit: limit !== null && point.predicted > limit,
    limit_ratio: limit !== null && limit > 0 ? point.predicted / limit : null,
    is_monitor: limit === null,
    monitor_reference_c: null,
    reliability: 'interpolation',
  }
  return statusOf(prediction)
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
  importance: FeatureImportance,
  variables: VariableMeta[] | undefined,
): ImportanceDatum[] {
  const meta = new Map((variables ?? []).map((v) => [v.name, v]))
  return CONFIG_VARIABLES.map((name) => {
    const v = meta.get(name)
    const usedByModel = v?.used_by_model ?? importance[name] > 0
    return {
      name,
      label: v?.label_pt ?? name,
      importance: importance[name],
      usedByModel,
      note: usedByModel ? '' : NOT_USED_LABEL_PT,
    }
  }).sort((a, b) => b.importance - a.importance)
}
