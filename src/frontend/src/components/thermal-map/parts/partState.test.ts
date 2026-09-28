import { describe, expect, it } from 'vitest'

import type { StoveConfig } from '@/contract/v1'
import variableOptions from '@data/variable_options.json'

import {
  BOARD_RIGHT_OFFSET_X,
  DEFLECTOR_BRANCH_FRACTION,
  FALLBACK_CONFIG,
  PART_IDS,
  PART_TO_VARIABLE,
  VARIABLE_TO_PART,
  partStateFromConfig,
} from './index'

function cfg(patch: Partial<StoveConfig> = {}): StoveConfig {
  return { ...FALLBACK_CONFIG, ...patch }
}

const OPTIONS = variableOptions as Record<string, { options: string[] }>

describe('VARIABLE_TO_PART', () => {
  it('mapeia as 7 variáveis do contrato, com `losses` sem peça', () => {
    const keys = Object.keys(VARIABLE_TO_PART).sort()
    expect(keys).toEqual(
      [
        'blower_direction',
        'board_position',
        'deflector_hole',
        'housing',
        'losses',
        'material_coil_support',
        'run_case',
      ].sort(),
    )
    expect(VARIABLE_TO_PART.losses).toBeNull()
  })

  it('só aponta para PartIds conhecidos e é consistente com PART_TO_VARIABLE', () => {
    for (const [variable, partId] of Object.entries(VARIABLE_TO_PART)) {
      if (partId === null) continue
      expect(PART_IDS).toContain(partId)
      expect(PART_TO_VARIABLE[partId]).toBe(variable)
    }
  })

  it('a configuração de referência usa apenas opções canônicas do dataset', () => {
    for (const [variable, value] of Object.entries(FALLBACK_CONFIG)) {
      expect(OPTIONS[variable].options).toContain(value)
    }
  })
})

describe('partStateFromConfig', () => {
  it('é determinística e pura', () => {
    const a = partStateFromConfig(cfg({ run_case: 'Broil C2' }))
    const b = partStateFromConfig(cfg({ run_case: 'Broil C2' }))
    expect(a).toEqual(b)
  })

  it('housing: Closed fecha, Open abre, Open - Updated abre com rasgos', () => {
    expect(partStateFromConfig(cfg({ housing: 'Closed' })).lid).toEqual({ open: false, vented: false })
    expect(partStateFromConfig(cfg({ housing: 'Open' })).lid).toEqual({ open: true, vented: false })
    expect(partStateFromConfig(cfg({ housing: 'Open - Updated' })).lid).toEqual({ open: true, vented: true })
  })

  it('blower_direction define o sentido do fluxo principal', () => {
    expect(partStateFromConfig(cfg({ blower_direction: 'To front' })).blower).toEqual({
      direction: 'front',
      axisZ: 1,
    })
    expect(partStateFromConfig(cfg({ blower_direction: 'To back' })).blower).toEqual({
      direction: 'back',
      axisZ: -1,
    })
  })

  it('deflector_hole aberto ramifica parte do fluxo para o IPC (H1)', () => {
    expect(partStateFromConfig(cfg({ deflector_hole: 'Closed' })).deflector).toEqual({
      hole: false,
      branchFraction: 0,
    })
    expect(partStateFromConfig(cfg({ deflector_hole: 'Open' })).deflector).toEqual({
      hole: true,
      branchFraction: DEFLECTOR_BRANCH_FRACTION,
    })
  })

  it('board_position desloca a placa apenas em Right', () => {
    expect(partStateFromConfig(cfg({ board_position: 'Center' })).board.offsetX).toBe(0)
    expect(partStateFromConfig(cfg({ board_position: 'Right' })).board.offsetX).toBe(BOARD_RIGHT_OFFSET_X)
  })

  it('material_coil_support escolhe o preset do suporte', () => {
    expect(partStateFromConfig(cfg({ material_coil_support: 'Aluminium' })).coilSupport.preset).toBe('aluminium')
    expect(partStateFromConfig(cfg({ material_coil_support: 'Aluminium Plate' })).coilSupport.preset).toBe(
      'aluminium-plate',
    )
    expect(partStateFromConfig(cfg({ material_coil_support: 'Plastic' })).coilSupport.preset).toBe('plastic')
  })

  it('Pyro: cooktop vazio e desligado, forno a 400 °C', () => {
    const s = partStateFromConfig(cfg({ run_case: 'Pyro' }))
    expect(s.cooktop.loads).toEqual([])
    expect(s.cooktop.litSlots).toEqual([])
    expect(s.ovenGlow.setpointC).toBe(400)
    expect(s.ovenGlow.intensity).toBe(1)
  })

  it('Broil C2: uma chapa sobre dois queimadores e duas panelas', () => {
    const s = partStateFromConfig(cfg({ run_case: 'Broil C2' }))
    expect(s.cooktop.loads.filter((l) => l.kind === 'griddle')).toHaveLength(1)
    expect(s.cooktop.loads.filter((l) => l.kind === 'pan')).toHaveLength(2)
    expect(s.cooktop.loads[0].slots).toEqual([0, 1])
    expect(s.cooktop.litSlots).toEqual([0, 1, 2, 3])
    expect(s.ovenGlow.setpointC).toBe(280)
  })

  it('Broil Qualitative: quatro panelas', () => {
    const s = partStateFromConfig(cfg({ run_case: 'Broil Qualitative' }))
    expect(s.cooktop.loads).toHaveLength(4)
    expect(s.cooktop.loads.every((l) => l.kind === 'pan')).toBe(true)
  })

  it('Broil C1: três panelas e uma chapa', () => {
    const s = partStateFromConfig(cfg({ run_case: 'Broil C1' }))
    expect(s.cooktop.loads.filter((l) => l.kind === 'pan')).toHaveLength(3)
    expect(s.cooktop.loads.filter((l) => l.kind === 'griddle')).toHaveLength(1)
  })

  it('o brilho do forno é maior no Pyro que nos modos Broil (H3 nos setpoints)', () => {
    const pyro = partStateFromConfig(cfg({ run_case: 'Pyro' })).ovenGlow.intensity
    for (const rc of ['Broil C1', 'Broil C2', 'Broil Qualitative']) {
      expect(partStateFromConfig(cfg({ run_case: rc })).ovenGlow.intensity).toBeLessThan(pyro)
    }
  })

  it('cobre todas as opções canônicas sem quebrar', () => {
    for (const [variable, meta] of Object.entries(OPTIONS)) {
      for (const value of meta.options) {
        const state = partStateFromConfig(cfg({ [variable]: value } as Partial<StoveConfig>))
        expect(state.ovenGlow.intensity).toBeGreaterThan(0)
        expect(state.cooktop.loads.length).toBeLessThanOrEqual(4)
      }
    }
  })

  it('cada carga do cooktop ocupa slots válidos e sem sobreposição', () => {
    for (const rc of ['Pyro', 'Broil C1', 'Broil C2', 'Broil Qualitative']) {
      const used = new Set<number>()
      for (const load of partStateFromConfig(cfg({ run_case: rc })).cooktop.loads) {
        for (const slot of load.slots) {
          expect(slot).toBeGreaterThanOrEqual(0)
          expect(slot).toBeLessThan(4)
          expect(used.has(slot)).toBe(false)
          used.add(slot)
        }
      }
    }
  })
})
