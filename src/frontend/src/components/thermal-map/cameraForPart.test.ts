import { describe, expect, it } from 'vitest'

import { BOARD_RIGHT_OFFSET_X, PART_IDS, type PartId } from './parts'
import { cameraForPart, type PartFocus } from './cameraForPart'
import { BLOWER, CAVITY, COIL, DEFLECTOR, HOUSING, STOVE_BOUNDS, type Bounds } from './zoneGeometry'

const centerOf = (b: Bounds): [number, number, number] => [
  (b.min[0] + b.max[0]) / 2,
  (b.min[1] + b.max[1]) / 2,
  (b.min[2] + b.max[2]) / 2,
]
const contains = (b: Bounds, p: [number, number, number]) => p.every((v, i) => v >= b.min[i] && v <= b.max[i])
const volumeOf = (b: Bounds) => b.max.reduce((v, max, i) => v * (max - b.min[i]), 1)
const focusOf = (part: PartId): PartFocus => cameraForPart(part).focus

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

  describe('região da peça (focus)', () => {
    it('toda peça tem uma caixa válida, com ângulos e folga', () => {
      for (const part of PART_IDS) {
        const { bounds, azimuthDeg, elevationDeg, margin } = focusOf(part)
        for (let axis = 0; axis < 3; axis += 1) expect(bounds.max[axis]).toBeGreaterThan(bounds.min[axis])
        expect(Number.isFinite(azimuthDeg)).toBe(true)
        expect(elevationDeg).toBeGreaterThan(0)
        expect(margin).toBeGreaterThanOrEqual(1)
      }
    })

    it('cada caixa contém a própria peça', () => {
      expect(contains(focusOf('housing-lid').bounds, [HOUSING.x, HOUSING.y, HOUSING.z])).toBe(true)
      expect(contains(focusOf('blower').bounds, [BLOWER.x, BLOWER.y, BLOWER.z])).toBe(true)
      expect(contains(focusOf('deflector').bounds, [DEFLECTOR.x, DEFLECTOR.y, DEFLECTOR.z])).toBe(true)
      expect(contains(focusOf('coil-support').bounds, [0, COIL.y, COIL.z])).toBe(true)
      expect(contains(focusOf('oven-glow').bounds, [0, CAVITY.yCenter, CAVITY.zCenter])).toBe(true)
    })

    it('a placa fica enquadrada nas duas posições (Center e Right)', () => {
      const board = focusOf('control-board').bounds
      const y = HOUSING.y - 1.2
      expect(contains(board, [HOUSING.x - 1.6, y, HOUSING.z])).toBe(true)
      expect(contains(board, [HOUSING.x - 1.6 + BOARD_RIGHT_OFFSET_X, y, HOUSING.z])).toBe(true)
    })

    it('peças diferentes levam a regiões diferentes, em vez do mesmo enquadramento do andar de cima', () => {
      const bay: PartId[] = ['housing-lid', 'control-board', 'blower', 'deflector']
      for (let i = 0; i < bay.length; i += 1) {
        for (let j = i + 1; j < bay.length; j += 1) {
          expect(centerOf(focusOf(bay[i]).bounds)).not.toEqual(centerOf(focusOf(bay[j]).bounds))
        }
      }
      // O blower fica à esquerda e a carcaça à direita: o alvo da câmera acompanha.
      expect(centerOf(focusOf('blower').bounds)[0]).toBeLessThan(centerOf(focusOf('housing-lid').bounds)[0])
    })

    it('a baía e o forno ficam dentro do fogão, e cada região é bem menor que ele', () => {
      const stoveVolume = volumeOf(STOVE_BOUNDS)
      const bay = ['housing-lid', 'control-board', 'blower', 'deflector'] as const
      for (const part of [...bay, 'coil-support', 'oven-glow'] as const) {
        const { bounds } = focusOf(part)
        for (let axis = 0; axis < 3; axis += 1) {
          expect(bounds.min[axis]).toBeGreaterThanOrEqual(STOVE_BOUNDS.min[axis])
          expect(bounds.max[axis]).toBeLessThanOrEqual(STOVE_BOUNDS.max[axis])
        }
        // a cavidade inteira do forno é a maior região; ainda assim, menos da metade do fogão
        expect(volumeOf(bounds)).toBeLessThan(stoveVolume / 2)
      }
      // as peças da baía são pequenas: a câmera tem de chegar bem perto
      for (const part of bay) expect(volumeOf(focusOf(part).bounds)).toBeLessThan(stoveVolume / 20)
    })

    it('a região acompanha a camada da vista explodida da peça', () => {
      for (const part of ['housing-lid', 'control-board', 'blower', 'deflector'] as const) {
        expect(focusOf(part).layer).toBe('bay')
      }
      expect(focusOf('cooktop-load').layer).toBe('glass')
      expect(focusOf('coil-support').layer).toBeUndefined()
      expect(focusOf('oven-glow').layer).toBeUndefined()
    })
  })
})
