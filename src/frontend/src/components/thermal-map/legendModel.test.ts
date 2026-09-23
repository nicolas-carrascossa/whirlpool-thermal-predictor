import { describe, expect, it } from 'vitest'

import type { SensorPrediction } from '@/contract/v1'

import { legendModel } from './legendModel'

function sensor(
  tc_number: number,
  key_area: string,
  temp_c: number,
  active_limit_c: number | null,
): SensorPrediction {
  return {
    tc_number,
    tc_name: `TC ${tc_number}`,
    key_area,
    temp_c,
    error_margin_c: 1,
    error_margin_pct: 1,
    active_limit_c,
    exceeds_limit: active_limit_c !== null && temp_c > active_limit_c,
    limit_ratio: active_limit_c !== null ? temp_c / active_limit_c : null,
    is_monitor: active_limit_c === null,
    monitor_reference_c: null,
    reliability: 'interpolation',
  algorithm: 'random_forest',
  }
}

describe('legendModel — status', () => {
  const predictions = [
    sensor(1, 'IPC Comp', 50, 90), // ok
    sensor(2, 'IPC Comp', 85, 90), // warn (0,94)
    sensor(3, 'CT Knobs', 30, 60), // ok
    sensor(4, 'Coil Temps', 241.5, 150), // danger
    sensor(5, 'Coil Temps', 40, 150), // ok
    sensor(6, 'Main Vent Sys', 97.9, null), // monitor
  ]

  it('conta sensores (não zonas) em cada status', () => {
    const model = legendModel('status', predictions)
    expect(model.mode).toBe('status')
    if (model.mode !== 'status') throw new Error('unreachable')
    const byStatus = Object.fromEntries(model.rows.map((r) => [r.status, r.count]))
    expect(byStatus).toEqual({ ok: 3, warn: 1, danger: 1, monitor: 1 })
  })

  it('a soma das linhas é o total de sensores no recorte', () => {
    const model = legendModel('status', predictions)
    if (model.mode !== 'status') throw new Error('unreachable')
    const total = model.rows.reduce((acc, r) => acc + r.count, 0)
    expect(total).toBe(predictions.length)
  })

  it('lista sempre as 4 linhas, mesmo com contagem zero', () => {
    const model = legendModel('status', [sensor(1, 'X', 10, 100)])
    if (model.mode !== 'status') throw new Error('unreachable')
    expect(model.rows.map((r) => r.status)).toEqual(['ok', 'warn', 'danger', 'monitor'])
  })

  it('vazio: todas as contagens em zero', () => {
    const model = legendModel('status', [])
    if (model.mode !== 'status') throw new Error('unreachable')
    expect(model.rows.every((r) => r.count === 0)).toBe(true)
  })
})

describe('legendModel — absolute', () => {
  const predictions = [
    sensor(1, 'A', 50, 90),
    sensor(2, 'A', 60, 90),
    sensor(3, 'B', 80, 90),
    sensor(4, 'C', 100, 150),
    sensor(5, 'D', 120, 150),
  ]

  it('ticks crescentes cobrindo mín e máx das médias por zona', () => {
    const model = legendModel('absolute', predictions)
    expect(model.mode).toBe('absolute')
    if (model.mode !== 'absolute') throw new Error('unreachable')
    expect(model.ticks).toHaveLength(5)
    expect(model.ticks[0]).toBe(model.min)
    expect(model.ticks[4]).toBe(model.max)
    for (let i = 1; i < model.ticks.length; i += 1) {
      expect(model.ticks[i]).toBeGreaterThanOrEqual(model.ticks[i - 1])
    }
    expect(model.unit).toBe('°C')
  })

  it('sem sensores: faixa em zero, sem quebrar', () => {
    const model = legendModel('absolute', [])
    if (model.mode !== 'absolute') throw new Error('unreachable')
    expect(model.min).toBe(0)
    expect(model.max).toBe(0)
    expect(model.ticks).toEqual([0, 0, 0, 0, 0])
  })
})

describe('legendModel — delta', () => {
  it('maxAbs bate com o maior |delta| entre as zonas', () => {
    const current = [sensor(1, 'A', 60, 90), sensor(2, 'B', 100, 150)]
    const reference = [sensor(1, 'A', 50, 90), sensor(2, 'B', 130, 150)]
    // A: +10, B: -30 → maior |delta| = 30
    const model = legendModel('delta', current, reference)
    expect(model.mode).toBe('delta')
    if (model.mode !== 'delta') throw new Error('unreachable')
    expect(model.maxAbs).toBeCloseTo(30, 5)
    expect(model.unit).toBe('°C')
  })

  it('sem referência: maxAbs zero', () => {
    const model = legendModel('delta', [sensor(1, 'A', 60, 90)])
    if (model.mode !== 'delta') throw new Error('unreachable')
    expect(model.maxAbs).toBe(0)
  })
})
