/**
 * Classificação de status a partir da razão temp/limite.
 * Regra única usada por tabela, gauge, barras e resumo, para que nenhum
 * componente invente seu próprio corte.
 */

import type { SensorPrediction } from '@/contract/v1'

export type SensorStatus = 'ok' | 'warn' | 'danger' | 'monitor'

/** Limiar de atenção: 90% do limite normativo. */
export const WARN_RATIO = 0.9

/**
 * Razão temp/limite em precisão total. O campo `limit_ratio` do contrato vem
 * arredondado em duas casas, o que faria 89,6 °C sobre um limite de 90 °C
 * (0,9955) virar 1,00 e ser rotulado como "excede". Aqui a razão é recalculada
 * a partir dos valores originais; `limit_ratio` é o fallback.
 */
export function ratioOf(prediction: SensorPrediction): number | null {
  if (prediction.active_limit_c !== null && prediction.active_limit_c > 0) {
    return prediction.temp_c / prediction.active_limit_c
  }
  return prediction.limit_ratio
}

export function statusOf(prediction: SensorPrediction): SensorStatus {
  const ratio = ratioOf(prediction)
  if (prediction.active_limit_c === null || ratio === null) return 'monitor'
  if (prediction.exceeds_limit || ratio > 1) return 'danger'
  if (ratio >= WARN_RATIO) return 'warn'
  return 'ok'
}

export const STATUS_COLOR: Record<SensorStatus, string> = {
  ok: 'var(--status-ok)',
  warn: 'var(--status-warn)',
  danger: 'var(--status-danger)',
  monitor: 'var(--wp-gray-45)',
}

/** Ordenação decrescente por razão; sensores sem limite (monitor) por último. */
export function byLimitRatioDesc(a: SensorPrediction, b: SensorPrediction): number {
  const ra = ratioOf(a)
  const rb = ratioOf(b)
  if (ra === null && rb === null) return a.tc_number - b.tc_number
  if (ra === null) return 1
  if (rb === null) return -1
  if (rb !== ra) return rb - ra
  return a.tc_number - b.tc_number
}
