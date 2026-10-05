import { describe, expect, it } from 'vitest'

import type { SensorPrediction, StoveConfig } from '@/contract/v1'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

import {
  anchorSensor,
  areaDeltas,
  changedVariables,
  rankSensitivity,
  sensitivityEffect,
  sensitivityCases,
  sensorDeltas,
  worstReliability,
} from './analysisModel'

const REFERENCE = FIXTURE_METADATA.reference_config as StoveConfig

/** Referência: cada sensor 10 °C mais frio, exceto o 3, que é 2 °C mais quente. */
const REFERENCE_PREDICTIONS: SensorPrediction[] = FIXTURE_RESPONSE.predictions.map((p) => ({
  ...p,
  temp_c: p.tc_number === 3 ? p.temp_c + 2 : p.temp_c - 10,
}))

describe('sensorDeltas / areaDeltas', () => {
  it('calcula atual − referência e ordena pelo maior módulo', () => {
    const rows = sensorDeltas(FIXTURE_RESPONSE.predictions, REFERENCE_PREDICTIONS)
    expect(rows.map((r) => [r.name, r.delta])).toEqual([
      ['IGBT 1', 10],
      ['CMC 1', 10],
      ['Vent Out', 10],
      ['Knob 1', -2],
    ])
  })

  it('filtra por área e ignora sensores ausentes na referência', () => {
    const rows = sensorDeltas(FIXTURE_RESPONSE.predictions, REFERENCE_PREDICTIONS.slice(0, 2), 'IPC Comp')
    expect(rows.map((r) => r.name)).toEqual(['CMC 1'])
  })

  it('resume por área, da que mais se moveu para a que menos', () => {
    const areas = areaDeltas(FIXTURE_RESPONSE.predictions, REFERENCE_PREDICTIONS)
    expect(areas.map((a) => a.keyArea)).toEqual(['IPC Comp', 'Main Vent Sys', 'CT Knobs'])
    expect(areas[0]).toMatchObject({ n: 2, meanDelta: 10 })
    expect(areas[2].peak.delta).toBe(-2)
  })
})

describe('changedVariables', () => {
  const variables = FIXTURE_METADATA.variables

  it('lista só o que difere da referência, da mais para a menos influente', () => {
    const config = { ...REFERENCE, blower_direction: 'To back', housing: 'Open', board_position: 'Right' }
    const rows = changedVariables(config, REFERENCE, variables, {
      blower_direction: 0.3,
      housing: 0.5,
      board_position: 0,
    })
    expect(rows.map((r) => r.name)).toEqual(['housing', 'blower_direction', 'board_position'])
    expect(rows[0]).toMatchObject({ from: 'Closed', to: 'Open', importance: 0.5, usedByModel: true })
    expect(rows[2].usedByModel).toBe(false)
  })

  it('vazio quando a consulta é a própria referência; sem importância fica nulo e vai por último', () => {
    expect(changedVariables(REFERENCE, REFERENCE, variables, {})).toEqual([])
    const rows = changedVariables({ ...REFERENCE, housing: 'Open', run_case: 'Broil C2' }, REFERENCE, variables, {
      run_case: 0.2,
    })
    expect(rows.map((r) => [r.name, r.importance])).toEqual([
      ['run_case', 0.2],
      ['housing', null],
    ])
  })
})

describe('sensitivityCases', () => {
  it('gera uma configuração por alternativa, trocando só uma variável', () => {
    const cases = sensitivityCases(REFERENCE, FIXTURE_METADATA)
    // 7 variáveis × 1 alternativa cada na fixture.
    expect(cases).toHaveLength(7)
    for (const c of cases) {
      const diff = Object.keys(REFERENCE).filter(
        (k) => REFERENCE[k as keyof StoveConfig] !== c.config[k as keyof StoveConfig],
      )
      expect(diff).toEqual([c.variable])
      expect(c.from).toBe(REFERENCE[c.variable])
    }
  })

  it('não oferece opções que os modelos unificam', () => {
    const metadata = {
      variables: [
        { name: 'housing', label_pt: 'x', help_pt: '', options: ['Closed', 'Open', 'Open - Updated'], used_by_model: true },
      ],
    }
    const cases = sensitivityCases(REFERENCE, metadata)
    expect(cases.map((c) => c.to)).toEqual(['Open'])
  })
})

describe('anchorSensor / rankSensitivity / worstReliability', () => {
  it('âncora: maior razão temp/limite; sem limite, só quando não há outro', () => {
    expect(anchorSensor(FIXTURE_RESPONSE.predictions)?.tc_name).toBe('IGBT 1')
    const onlyMonitor = FIXTURE_RESPONSE.predictions.filter((p) => p.is_monitor)
    expect(anchorSensor(onlyMonitor)?.tc_name).toBe('Vent Out')
    expect(anchorSensor([])).toBeNull()
  })

  it('ordena pelo maior efeito em módulo', () => {
    const rows = rankSensitivity([
      { variable: 'housing', from: 'a', to: 'b', sensor: 'S', delta: -1, reliability: 'interpolation' },
      { variable: 'run_case', from: 'a', to: 'b', sensor: 'S', delta: 6, reliability: 'interpolation' },
      { variable: 'losses', from: 'a', to: 'b', sensor: 'S', delta: -9, reliability: 'interpolation' },
    ])
    expect(rows.map((r) => r.variable)).toEqual(['losses', 'run_case', 'housing'])
  })

  it('pega a pior confiabilidade entre os sensores', () => {
    const [a, b] = FIXTURE_RESPONSE.predictions
    expect(worstReliability([a, { ...b, reliability: 'moderate_extrapolation' }])).toBe('moderate_extrapolation')
    expect(worstReliability([a, { ...b, reliability: 'out_of_domain' }])).toBe('out_of_domain')
    expect(worstReliability([a, b])).toBe('interpolation')
  })
})

describe('sensitivityEffect', () => {
  const base = FIXTURE_RESPONSE.predictions.filter((p) => p.key_area === 'IPC Comp')
  // IGBT 1 (tc 1) sobe 2 °C; CMC 1 (tc 2) cai 7 °C.
  const alt = base.map((p) => ({ ...p, temp_c: p.temp_c + (p.tc_number === 1 ? 2 : -7) }))

  it('em "peak", devolve o sensor que mais se move, com o sinal do Δ', () => {
    expect(sensitivityEffect(base, alt, 'peak')).toEqual({ sensor: 'CMC 1', delta: -7 })
  })

  it('com um termopar fixo, devolve o Δ só daquele sensor', () => {
    expect(sensitivityEffect(base, alt, 1)).toEqual({ sensor: 'IGBT 1', delta: 2 })
  })

  it('devolve null se o sensor não está nas duas respostas', () => {
    expect(sensitivityEffect(base, alt, 99)).toBeNull()
    expect(sensitivityEffect(base, [], 'peak')).toBeNull()
  })
})
