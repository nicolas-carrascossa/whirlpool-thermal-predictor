import { describe, expect, it } from 'vitest'

import type { SensorPrediction } from '@/contract/v1'

import {
  visibleLabelZones,
  worstSensorOf,
  ZONE_STATUS_COLOR,
  zoneStatusColor,
  zoneStatusOf,
} from './zoneStatus'

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

describe('zoneStatusOf / zoneStatusColor', () => {
  const predictions = [
    sensor(1, 'IPC Comp', 50, 90), // ok (0,55)
    sensor(2, 'IPC Comp', 85, 90), // warn (0,94)
    sensor(3, 'CT Knobs', 30, 60), // ok
    sensor(4, 'Coil Temps', 241.5, 150), // danger
    sensor(5, 'Coil Temps', 40, 150), // ok
    sensor(6, 'Main Vent Sys', 97.9, null), // monitor
  ]

  it('usa o pior sensor da área', () => {
    expect(zoneStatusOf(predictions, 'IPC Comp')).toBe('warn')
    expect(zoneStatusOf(predictions, 'Coil Temps')).toBe('danger')
    expect(zoneStatusOf(predictions, 'CT Knobs')).toBe('ok')
  })

  it('área só de monitoramento vira "none" (cinza)', () => {
    expect(zoneStatusOf(predictions, 'Main Vent Sys')).toBe('none')
    expect(zoneStatusColor(predictions, 'Main Vent Sys')).toBe(ZONE_STATUS_COLOR.none)
  })

  it('área sem sensores no recorte vira "none"', () => {
    expect(zoneStatusOf(predictions, 'Mainback')).toBe('none')
    expect(zoneStatusOf([], 'IPC Comp')).toBe('none')
  })

  it('traduz o status nas cores dos tokens', () => {
    expect(zoneStatusColor(predictions, 'CT Knobs')).toBe('#6aa342')
    expect(zoneStatusColor(predictions, 'IPC Comp')).toBe('#e08650')
    expect(zoneStatusColor(predictions, 'Coil Temps')).toBe('#b3261e')
  })

  it('reaproveita o corte de 90% de lib/status (89,9% ainda é ok)', () => {
    expect(zoneStatusOf([sensor(9, 'X', 89.9, 100)], 'X')).toBe('ok')
    expect(zoneStatusOf([sensor(9, 'X', 90.0, 100)], 'X')).toBe('warn')
    expect(zoneStatusOf([sensor(9, 'X', 100.1, 100)], 'X')).toBe('danger')
  })

  it('worstSensorOf devolve o sensor de maior razão da área, ignorando monitores', () => {
    expect(worstSensorOf(predictions, 'Coil Temps')?.tc_number).toBe(4)
    expect(worstSensorOf(predictions, 'Main Vent Sys')).toBeNull()
  })
})

describe('visibleLabelZones', () => {
  const zones = [
    { key: 'IPC Comp', status: 'danger' as const },
    { key: 'CT Knobs', status: 'ok' as const },
    { key: 'Main Vent Sys', status: 'none' as const },
    { key: 'Oven HMI', status: 'warn' as const },
  ]

  it('"alertas" mostra só atenção e excesso', () => {
    expect(visibleLabelZones('alerts', zones)).toEqual(['IPC Comp', 'Oven HMI'])
  })

  it('"alertas" acrescenta a zona selecionada, sem duplicar', () => {
    expect(visibleLabelZones('alerts', zones, 'CT Knobs')).toEqual(['IPC Comp', 'Oven HMI', 'CT Knobs'])
    expect(visibleLabelZones('alerts', zones, 'IPC Comp')).toEqual(['IPC Comp', 'Oven HMI'])
  })

  it('ignora uma seleção que não é uma zona do mapa', () => {
    expect(visibleLabelZones('alerts', zones, 'Inexistente')).toEqual(['IPC Comp', 'Oven HMI'])
  })

  it('"todos" mostra todas as zonas e "nenhum" não mostra nada', () => {
    expect(visibleLabelZones('all', zones)).toHaveLength(4)
    expect(visibleLabelZones('none', zones, 'IPC Comp')).toEqual([])
  })
})
