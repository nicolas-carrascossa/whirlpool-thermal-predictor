import { describe, expect, it } from 'vitest'

import { PART_IDS } from './parts'
import { cameraForPart } from './cameraForPart'

describe('cameraForPart', () => {
  it('eletrônica do console vai para o preset console, com a tampa aberta', () => {
    for (const part of ['housing-lid', 'blower', 'deflector', 'control-board'] as const) {
      const result = cameraForPart(part)
      expect(result.preset).toBe('console')
      expect(result.openings).toEqual({ console: true })
    }
  })

  it('peças do forno vão para o preset frente, com a porta aberta', () => {
    for (const part of ['coil-support', 'oven-glow'] as const) {
      const result = cameraForPart(part)
      expect(result.preset).toBe('front')
      expect(result.openings).toEqual({ oven: true })
    }
  })

  it('carga do cooktop vai para o preset isométrico, sem abrir nada', () => {
    const result = cameraForPart('cooktop-load')
    expect(result.preset).toBe('iso')
    expect(result.openings).toBeUndefined()
  })

  it('cobre todas as peças conhecidas sem lançar', () => {
    for (const part of PART_IDS) {
      expect(() => cameraForPart(part)).not.toThrow()
    }
  })
})
