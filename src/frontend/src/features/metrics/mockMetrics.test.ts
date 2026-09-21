/**
 * Invariantes dos dados simulados. O mais importante é a coerência com a H2:
 * `losses` e `board_position` não são usadas pelo modelo, então a importância
 * delas precisa ser exatamente 0 em todas as áreas — senão a aba contradiz o
 * badge "informativo — não usado pelo modelo" do painel de configuração.
 */

import { describe, expect, it } from 'vitest'

import { FIXTURE_METADATA } from '@/test/fixtures'

import {
  equalAxisDomain,
  errorProfileOf,
  importanceData,
  kpiStatusOf,
  NOT_USED_LABEL_PT,
  relativeLuminance,
  statusForPoint,
  textColorForBackground,
} from './metricsModel'
import {
  CONFIG_VARIABLES,
  KPI_MAPE_LIMIT_PCT,
  METRICS_DISCLAIMER,
  MOCK_AREA_METRICS,
  VARIABLES_NOT_USED_BY_MODEL,
  metricsForArea,
} from './mockMetrics'

const REAL_KEY_AREAS = ['Mainback', 'Coil Temps', 'Main Vent Sys', 'IPC Cooling', 'IPC Comp', 'CT Knobs', 'Oven HMI']

/** Média / desvio populacional do dataset real, em °C. */
const THERMAL_RANGE: Record<string, { mean: number; sd: number }> = {
  Mainback: { mean: 80.7, sd: 47.6 },
  'Coil Temps': { mean: 126.9, sd: 45.0 },
  'Main Vent Sys': { mean: 80.5, sd: 21.4 },
  'IPC Cooling': { mean: 57.4, sd: 18.6 },
  'IPC Comp': { mean: 83.4, sd: 17.0 },
  'CT Knobs': { mean: 49.3, sd: 7.7 },
  'Oven HMI': { mean: 58.1, sd: 3.9 },
}

describe('mockMetrics — invariantes', () => {
  it('cobre exatamente as 7 áreas reais do dataset, sem repetição', () => {
    expect(MOCK_AREA_METRICS.map((m) => m.keyArea).sort()).toEqual([...REAL_KEY_AREAS].sort())
  })

  it('H2: losses e board_position têm importância exatamente 0 em todas as áreas', () => {
    for (const area of MOCK_AREA_METRICS) {
      for (const variable of VARIABLES_NOT_USED_BY_MODEL) {
        expect(area.featureImportance[variable], `${area.keyArea}.${variable}`).toBe(0)
      }
    }
  })

  it('as 5 variáveis usadas pelo modelo somam 1,0 em cada área', () => {
    for (const area of MOCK_AREA_METRICS) {
      const total = CONFIG_VARIABLES.reduce((s, v) => s + area.featureImportance[v], 0)
      expect(total, area.keyArea).toBeCloseTo(1, 6)
    }
  })

  it('tem entre 20 e 40 pares previsto/real por área, dentro da faixa térmica real', () => {
    for (const area of MOCK_AREA_METRICS) {
      const n = area.predictedVsActual.length
      expect(n, area.keyArea).toBeGreaterThanOrEqual(20)
      expect(n, area.keyArea).toBeLessThanOrEqual(40)
      const { mean, sd } = THERMAL_RANGE[area.keyArea]
      for (const p of area.predictedVsActual) {
        expect(p.actual, `${area.keyArea} ${p.tcName}`).toBeGreaterThanOrEqual(Math.max(25, mean - 2.5 * sd))
        expect(p.actual, `${area.keyArea} ${p.tcName}`).toBeLessThanOrEqual(mean + 2.5 * sd)
      }
    }
  })

  it('as métricas de erro batem com os próprios pares (mesma história em tabela e gráficos)', () => {
    for (const area of MOCK_AREA_METRICS) {
      const profile = errorProfileOf(area.predictedVsActual)
      expect(profile.mae, area.keyArea).toBeCloseTo(area.errorMetrics.mae, 1)
      expect(profile.rmse, area.keyArea).toBeCloseTo(area.errorMetrics.rmse, 1)
      const within =
        area.predictedVsActual.filter((p) => Math.abs(p.predicted - p.actual) / p.actual <= 0.1).length /
        area.predictedVsActual.length
      expect(within, area.keyArea).toBeCloseTo(area.errorMetrics.withinTenPctRate, 2)
    }
  })

  it('o erro varia entre áreas: baixa dispersão com MAE menor, alta dispersão com R² melhor', () => {
    const m = (k: string) => metricsForArea(k)!.errorMetrics
    expect(m('Oven HMI').mae).toBeLessThan(m('Mainback').mae)
    expect(m('CT Knobs').mae).toBeLessThan(m('Coil Temps').mae)
    expect(m('Mainback').r2).toBeGreaterThan(m('Oven HMI').r2)
    expect(m('Coil Temps').r2).toBeGreaterThan(m('CT Knobs').r2)
    // Ao menos uma área fora do KPI, para o destaque da tabela ter o que mostrar.
    expect(MOCK_AREA_METRICS.some((a) => a.errorMetrics.mapePct > KPI_MAPE_LIMIT_PCT)).toBe(true)
  })

  it('exporta a ressalva de dados simulados', () => {
    expect(METRICS_DISCLAIMER).toMatch(/simulad/i)
  })
})

describe('metricsModel', () => {
  it('classifica a área frente ao KPI de 10 %', () => {
    const base = { mae: 1, rmse: 1, r2: 0.5, withinTenPctRate: 0.9 }
    expect(kpiStatusOf({ ...base, mapePct: 4 })).toBe('ok')
    expect(kpiStatusOf({ ...base, mapePct: 9 })).toBe('warn')
    expect(kpiStatusOf({ ...base, mapePct: 12 })).toBe('danger')
  })

  it('usa o mesmo domínio para os dois eixos, arredondado a 10 °C', () => {
    const [lo, hi] = equalAxisDomain([
      { tcNumber: 1, tcName: 'a', run: 'Run 01', activeLimitC: null, actual: 43, predicted: 58 },
      { tcNumber: 2, tcName: 'b', run: 'Run 01', activeLimitC: null, actual: 91, predicted: 87 },
    ])
    expect(lo).toBe(40)
    expect(hi).toBe(100)
    expect(lo % 10).toBe(0)
  })

  it('classifica o status do par pela regra da app (previsto vs. limite)', () => {
    const p = { tcNumber: 1, tcName: 'a', run: 'Run 01' }
    expect(statusForPoint({ ...p, activeLimitC: null, actual: 50, predicted: 50 })).toBe('monitor')
    expect(statusForPoint({ ...p, activeLimitC: 100, actual: 50, predicted: 50 })).toBe('ok')
    expect(statusForPoint({ ...p, activeLimitC: 100, actual: 90, predicted: 92 })).toBe('warn')
    expect(statusForPoint({ ...p, activeLimitC: 100, actual: 99, predicted: 103 })).toBe('danger')
  })

  it('ordena a importância e rotula as variáveis fora do modelo com o texto do painel', () => {
    const data = importanceData(metricsForArea('Mainback')!.featureImportance, FIXTURE_METADATA.variables)
    expect(data).toHaveLength(7)
    for (let i = 1; i < data.length; i += 1) {
      expect(data[i - 1].importance).toBeGreaterThanOrEqual(data[i].importance)
    }
    expect(data[0].label).toBe('Modo de operação')
    const notUsed = data.filter((d) => !d.usedByModel).map((d) => d.name).sort()
    expect(notUsed).toEqual(['board_position', 'losses'])
    for (const d of data) expect(d.note).toBe(d.usedByModel ? '' : NOT_USED_LABEL_PT)
  })

  it('escolhe a cor do texto pela luminância do fundo', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3)
    expect(relativeLuminance('#000000')).toBe(0)
    expect(textColorForBackground('#b3261e')).toBe('var(--wp-white)')
    expect(textColorForBackground('#eeb111')).toBe('var(--wp-gray-85)')
  })
})
