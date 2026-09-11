import { describe, expect, it } from 'vitest'

import type { SensorPrediction } from '@/contract/v1'
import { byLimitRatioDesc, ratioOf, statusOf } from '@/lib/status'

function pred(partial: Partial<SensorPrediction>): SensorPrediction {
  return {
    tc_number: 1,
    tc_name: 'TC',
    key_area: 'IPC Comp',
    temp_c: 50,
    error_margin_c: 1,
    error_margin_pct: 2,
    active_limit_c: 100,
    exceeds_limit: false,
    limit_ratio: 0.5,
    is_monitor: false,
    monitor_reference_c: null,
    reliability: 'interpolation',
    ...partial,
  }
}

describe('statusOf', () => {
  it('classifica ok, atenção e excesso pelos cortes de 90% e 100%', () => {
    expect(statusOf(pred({ temp_c: 50 }))).toBe('ok')
    expect(statusOf(pred({ temp_c: 92 }))).toBe('warn')
    expect(statusOf(pred({ temp_c: 104, exceeds_limit: true }))).toBe('danger')
  })

  it('trata sensores sem limite como monitoramento', () => {
    expect(statusOf(pred({ active_limit_c: null, limit_ratio: null, is_monitor: true }))).toBe(
      'monitor',
    )
  })

  it('não marca como excesso um valor abaixo do limite cujo limit_ratio arredonda para 1,00', () => {
    // 89,6 / 90 = 0,9955 → o contrato devolve limit_ratio 1.0 (2 casas).
    const p = pred({ temp_c: 89.6, active_limit_c: 90, limit_ratio: 1.0, exceeds_limit: false })
    expect(ratioOf(p)).toBeCloseTo(0.9956, 4)
    expect(statusOf(p)).toBe('warn')
  })
})

describe('byLimitRatioDesc', () => {
  it('ordena por razão decrescente e joga os sensores de monitoramento para o fim', () => {
    const rows = [
      pred({ tc_number: 1, temp_c: 50 }),
      pred({ tc_number: 2, active_limit_c: null, limit_ratio: null }),
      pred({ tc_number: 3, temp_c: 95 }),
    ].sort(byLimitRatioDesc)
    expect(rows.map((r) => r.tc_number)).toEqual([3, 1, 2])
  })
})
