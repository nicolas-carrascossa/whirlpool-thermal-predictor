import { describe, expect, it } from 'vitest'

import type { SensorPrediction } from '@/contract/v1'

import { absoluteRange, aggregateByKeyArea, formatTempPt, maxAbsDelta } from './aggregate'

function sensor(overrides: Partial<SensorPrediction> & { key_area: string; temp_c: number }): SensorPrediction {
  return {
    tc_number: 1,
    tc_name: 'TC1',
    error_margin_c: 1,
    error_margin_pct: 1,
    active_limit_c: null,
    exceeds_limit: false,
    limit_ratio: null,
    is_monitor: false,
    monitor_reference_c: null,
    reliability: 'interpolation',
    ...overrides,
  }
}

const LABELS = {
  'IPC Comp': 'Compartimento da eletrônica de potência',
  'Main Vent Sys': 'Ventilação principal',
  'CT Knobs': 'Botões do cooktop',
}

describe('aggregateByKeyArea', () => {
  it('calcula média, mín, máx, n e exceedCount por área', () => {
    const predictions: SensorPrediction[] = [
      sensor({ tc_number: 1, key_area: 'IPC Comp', temp_c: 80, active_limit_c: 100, exceeds_limit: false }),
      sensor({ tc_number: 2, key_area: 'IPC Comp', temp_c: 120, active_limit_c: 100, exceeds_limit: true }),
    ]
    const [ipc] = aggregateByKeyArea(predictions, { 'IPC Comp': 'Compartimento da eletrônica de potência' })
    expect(ipc.key).toBe('IPC Comp')
    expect(ipc.hasSensors).toBe(true)
    expect(ipc.n).toBe(2)
    expect(ipc.mean).toBe(100)
    expect(ipc.min).toBe(80)
    expect(ipc.max).toBe(120)
    expect(ipc.exceedCount).toBe(1)
  })

  it('marca como sem sensores (cinza) uma área presente em keyAreaLabels mas ausente nas predições', () => {
    const predictions: SensorPrediction[] = [sensor({ key_area: 'IPC Comp', temp_c: 80 })]
    const result = aggregateByKeyArea(predictions, LABELS)
    const ventSys = result.find((a) => a.key === 'Main Vent Sys')!
    expect(ventSys.hasSensors).toBe(false)
    expect(ventSys.n).toBe(0)
    expect(ventSys.mean).toBeNull()
    expect(ventSys.label).toBe('Ventilação principal')
  })

  it('usa a própria key como rótulo quando não há entrada em keyAreaLabels', () => {
    const predictions: SensorPrediction[] = [sensor({ key_area: 'Unknown Zone', temp_c: 50 })]
    const [agg] = aggregateByKeyArea(predictions, {})
    expect(agg.label).toBe('Unknown Zone')
  })

  it('calcula delta contra referencePredictions quando fornecido', () => {
    const current: SensorPrediction[] = [sensor({ key_area: 'IPC Comp', temp_c: 90 })]
    const reference: SensorPrediction[] = [sensor({ key_area: 'IPC Comp', temp_c: 80 })]
    const [agg] = aggregateByKeyArea(current, { 'IPC Comp': 'IPC' }, reference)
    expect(agg.referenceMean).toBe(80)
    expect(agg.delta).toBeCloseTo(10)
  })

  it('delta é null quando não há referencePredictions', () => {
    const current: SensorPrediction[] = [sensor({ key_area: 'IPC Comp', temp_c: 90 })]
    const [agg] = aggregateByKeyArea(current, { 'IPC Comp': 'IPC' })
    expect(agg.delta).toBeNull()
  })
})

describe('absoluteRange', () => {
  it('retorna mín/máx das médias das zonas com sensores', () => {
    const predictions: SensorPrediction[] = [
      sensor({ key_area: 'IPC Comp', temp_c: 100 }),
      sensor({ key_area: 'Main Vent Sys', temp_c: 40 }),
    ]
    const aggregates = aggregateByKeyArea(predictions, LABELS)
    expect(absoluteRange(aggregates)).toEqual({ min: 40, max: 100 })
  })

  it('retorna {0,0} quando nenhuma zona tem sensores', () => {
    expect(absoluteRange(aggregateByKeyArea([], LABELS))).toEqual({ min: 0, max: 0 })
  })
})

describe('maxAbsDelta', () => {
  it('retorna o maior |delta| entre as zonas', () => {
    const current: SensorPrediction[] = [
      sensor({ key_area: 'IPC Comp', temp_c: 90 }),
      sensor({ key_area: 'Main Vent Sys', temp_c: 30 }),
    ]
    const reference: SensorPrediction[] = [
      sensor({ key_area: 'IPC Comp', temp_c: 80 }),
      sensor({ key_area: 'Main Vent Sys', temp_c: 40 }),
    ]
    const aggregates = aggregateByKeyArea(current, LABELS, reference)
    expect(maxAbsDelta(aggregates)).toBeCloseTo(10)
  })

  it('retorna 0 quando não há deltas', () => {
    expect(maxAbsDelta(aggregateByKeyArea([], LABELS))).toBe(0)
  })
})

describe('formatTempPt', () => {
  it('formata em pt-BR com uma casa decimal e unidade', () => {
    expect(formatTempPt(83.4398)).toBe('83,4 °C')
  })

  it('omite a unidade quando pedido', () => {
    expect(formatTempPt(83.4398, { withUnit: false })).toBe('83,4')
  })

  it('adiciona sinal de + em valores positivos quando pedido', () => {
    expect(formatTempPt(2.3, { withSign: true })).toBe('+2,3 °C')
    expect(formatTempPt(-2.3, { withSign: true })).toBe('-2,3 °C')
  })
})
