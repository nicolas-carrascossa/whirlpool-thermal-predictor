/**
 * Derivações puras da aba de métricas.
 *
 * Substitui `mockMetrics.test.ts`, que verificava invariantes de um conjunto de
 * dados simulados que não existe mais: a dispersão e o mapa de calor passaram a
 * ler os pares previsto/real medidos em laboratório, servidos no contrato v1.2.
 * O que sobrou aqui são as regras que continuam sendo do front — recorte,
 * identificação do ensaio consultado, escalas e rótulos.
 */

import { describe, expect, it } from 'vitest'

import type { ValidationPoint } from '@/contract/v1'
import { FIXTURE_METADATA } from '@/test/fixtures'

import {
  equalAxisDomain,
  errorProfileOf,
  executedRunIndex,
  importanceData,
  kpiStatusForMape,
  NOT_USED_LABEL_PT,
  relativeLuminance,
  scopeToPrediction,
  statusForPoint,
  textColorForBackground,
} from './metricsModel'

function point(over: Partial<ValidationPoint> = {}): ValidationPoint {
  return {
    target: 'a',
    run: 0,
    tc_numbers: [1],
    tc_name: 'a',
    active_limit_c: null,
    actual_c: 50,
    predicted_c: 50,
    ...over,
  }
}

describe('KPI', () => {
  it('classifica a área frente ao limite de 10 %', () => {
    expect(kpiStatusForMape(4)).toBe('ok')
    expect(kpiStatusForMape(9)).toBe('warn')
    expect(kpiStatusForMape(12)).toBe('danger')
  })
})

describe('recorte pela previsão executada', () => {
  it('sem recorte, devolve todos os pontos', () => {
    const points = [point({ tc_numbers: [1] }), point({ tc_numbers: [2] })]
    expect(scopeToPrediction(points, undefined)).toHaveLength(2)
    expect(scopeToPrediction(points, new Set())).toHaveLength(2)
  })

  it('mantém apenas os pontos que tocam um termopar da consulta', () => {
    const points = [point({ tc_numbers: [1] }), point({ tc_numbers: [2] })]
    expect(scopeToPrediction(points, new Set([2]))).toEqual([points[1]])
  })

  it('a coluna fundida entra quando QUALQUER um dos seus 16 foi pedido', () => {
    const igbt = point({ target: 'IGBT', tc_numbers: [36, 37, 38, 39] })
    expect(scopeToPrediction([igbt], new Set([39]))).toEqual([igbt])
    expect(scopeToPrediction([igbt], new Set([99]))).toEqual([])
  })
})

describe('ensaio equivalente à consulta', () => {
  it('reconhece o ensaio cujos previstos batem com os da consulta', () => {
    const points = [
      point({ run: 0, tc_numbers: [1], predicted_c: 10 }),
      point({ run: 0, tc_numbers: [2], predicted_c: 20 }),
      point({ run: 1, tc_numbers: [1], predicted_c: 11 }),
      point({ run: 1, tc_numbers: [2], predicted_c: 21 }),
    ]
    const executed = new Map([
      [1, 11],
      [2, 21],
    ])
    expect(executedRunIndex(points, executed)).toBe(1)
  })

  it('exige que TODOS os sensores comparáveis batam, não só um', () => {
    const points = [
      point({ run: 0, tc_numbers: [1], predicted_c: 10 }),
      point({ run: 0, tc_numbers: [2], predicted_c: 20 }),
    ]
    // O sensor 1 coincide por acaso; o 2 não. Não é o mesmo ensaio.
    expect(executedRunIndex(points, new Map([[1, 10], [2, 99]]))).toBeNull()
  })

  it('devolve null quando a configuração consultada é inédita', () => {
    const points = [point({ run: 0, tc_numbers: [1], predicted_c: 10 })]
    expect(executedRunIndex(points, new Map([[1, 42]]))).toBeNull()
    expect(executedRunIndex(points, new Map())).toBeNull()
  })
})

describe('escalas e status', () => {
  it('usa o mesmo domínio para os dois eixos, arredondado a 10 °C', () => {
    const [lo, hi] = equalAxisDomain([
      point({ actual_c: 43, predicted_c: 58 }),
      point({ actual_c: 91, predicted_c: 87 }),
    ])
    expect(lo).toBe(40)
    expect(hi).toBe(100)
  })

  it('classifica o status do par pela regra da app (previsto vs. limite)', () => {
    expect(statusForPoint(point({ active_limit_c: null }))).toBe('monitor')
    expect(statusForPoint(point({ active_limit_c: 100, predicted_c: 50 }))).toBe('ok')
    expect(statusForPoint(point({ active_limit_c: 100, predicted_c: 92 }))).toBe('warn')
    expect(statusForPoint(point({ active_limit_c: 100, predicted_c: 103 }))).toBe('danger')
  })

  it('o perfil de erro sai dos próprios resíduos, em valor absoluto', () => {
    const profile = errorProfileOf([
      point({ actual_c: 100, predicted_c: 90 }), // erro 10
      point({ actual_c: 100, predicted_c: 120 }), // erro 20
    ])
    expect(profile.mae).toBe(15)
    expect(profile.max).toBe(20)
    expect(profile.median).toBe(15)
  })

  it('sem pontos, o perfil é NaN em vez de 0 — 0 significaria erro nenhum', () => {
    expect(errorProfileOf([]).mae).toBeNaN()
  })

  it('escolhe a cor do texto pela luminância do fundo', () => {
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(relativeLuminance('#000000'))
    expect(textColorForBackground('#ffffff')).toBe('var(--wp-gray-85)')
    expect(textColorForBackground('#000000')).toBe('var(--wp-white)')
  })
})

describe('importância das variáveis', () => {
  it('ordena e rotula as variáveis fora do modelo com o texto do painel', () => {
    const importance = {
      blower_direction: 0.2,
      housing: 0.3,
      board_position: 0,
      run_case: 0.4,
      losses: 0,
      deflector_hole: 0.05,
      material_coil_support: 0.05,
    }
    const data = importanceData(importance, FIXTURE_METADATA.variables)
    expect(data).toHaveLength(7)
    for (let i = 1; i < data.length; i += 1) {
      expect(data[i - 1].importance).toBeGreaterThanOrEqual(data[i].importance)
    }
    expect(data[0].label).toBe('Modo de operação')
    // Quem não é usada vem de `used_by_model` na metadata (a fixture simula o
    // mock da Fase 1), nunca de uma lista fixa no front.
    const notUsed = data.filter((d) => !d.usedByModel).map((d) => d.name).sort()
    expect(notUsed).toEqual(['board_position', 'losses'])
    for (const d of data) expect(d.note).toBe(d.usedByModel ? '' : NOT_USED_LABEL_PT)
  })
})
