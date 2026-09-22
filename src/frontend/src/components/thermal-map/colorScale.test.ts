import { describe, expect, it } from 'vitest'

import {
  divergentColorHex,
  heatColorHex,
  heatColorForValue,
  divergentColorForDelta,
  ZONE_GRAY_HEX,
} from './colorScale'

describe('heatColorHex (escala absoluta)', () => {
  it('nos pontos de parada, reproduz exatamente as cores da escala oficial', () => {
    expect(heatColorHex(0)).toBe('#00a0dd')
    expect(heatColorHex(0.35)).toBe('#eeb111')
    expect(heatColorHex(0.68)).toBe('#e08650')
    expect(heatColorHex(1)).toBe('#b3261e')
  })

  it('clampa valores fora de [0,1]', () => {
    expect(heatColorHex(-1)).toBe('#00a0dd')
    expect(heatColorHex(2)).toBe('#b3261e')
  })

  it('heatColorForValue normaliza entre min e max', () => {
    expect(heatColorForValue(10, 10, 20)).toBe('#00a0dd')
    expect(heatColorForValue(20, 10, 20)).toBe('#b3261e')
  })

  it('heatColorForValue não quebra quando min === max', () => {
    expect(heatColorForValue(50, 50, 50)).toBe('#00a0dd')
  })
})

describe('divergentColorHex (escala do modo delta)', () => {
  it('em -1/0/+1 retorna azul-núcleo, branco e laranja de status', () => {
    expect(divergentColorHex(-1)).toBe('#0d436b')
    expect(divergentColorHex(0)).toBe('#ffffff')
    expect(divergentColorHex(1)).toBe('#e08650')
  })

  it('clampa valores fora de [-1,1]', () => {
    expect(divergentColorHex(-5)).toBe('#0d436b')
    expect(divergentColorHex(5)).toBe('#e08650')
  })

  it('divergentColorForDelta é simétrica em torno de zero', () => {
    expect(divergentColorForDelta(0, 10)).toBe('#ffffff')
    expect(divergentColorForDelta(-10, 10)).toBe('#0d436b')
    expect(divergentColorForDelta(10, 10)).toBe('#e08650')
  })

  it('divergentColorForDelta não quebra quando maxAbs é zero', () => {
    expect(divergentColorForDelta(0, 0)).toBe('#ffffff')
  })
})

describe('ZONE_GRAY_HEX', () => {
  it('é o cinza --wp-gray-20 do design system', () => {
    expect(ZONE_GRAY_HEX).toBe('#d1d3d4')
  })
})
