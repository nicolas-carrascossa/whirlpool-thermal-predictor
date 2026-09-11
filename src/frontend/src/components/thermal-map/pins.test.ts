import { describe, expect, it } from 'vitest'

import { PIN_SURFACE_OFFSET, pinPositionsForZone } from './pins'
import { GEOMETRY_ZONE_KEYS, zoneBounds } from './zoneGeometry'

describe('pinPositionsForZone', () => {
  it('é determinística: mesma zona e mesma contagem → mesmas posições', () => {
    expect(pinPositionsForZone('IPC Comp', 6)).toEqual(pinPositionsForZone('IPC Comp', 6))
  })

  it('respeita a contagem pedida', () => {
    for (const n of [1, 2, 5, 12, 25]) {
      expect(pinPositionsForZone('Mainback', n)).toHaveLength(n)
    }
    expect(pinPositionsForZone('Mainback', 0)).toEqual([])
  })

  it('devolve lista vazia para uma zona sem geometria', () => {
    expect(pinPositionsForZone('Zona Inexistente', 4)).toEqual([])
  })

  it('mantém todos os pinos dentro da caixa da zona, deslocados da superfície', () => {
    const tol = PIN_SURFACE_OFFSET + 0.001
    for (const key of GEOMETRY_ZONE_KEYS) {
      const b = zoneBounds(key)
      expect(b).not.toBeNull()
      if (!b) continue
      for (const p of pinPositionsForZone(key, 9)) {
        for (let a = 0; a < 3; a += 1) {
          expect(p[a]).toBeGreaterThanOrEqual(b.min[a] - tol)
          expect(p[a]).toBeLessThanOrEqual(b.max[a] + tol)
        }
      }
    }
  })

  it('não empilha dois pinos na mesma posição', () => {
    const points = pinPositionsForZone('IPC Comp', 8)
    const keys = new Set(points.map((p) => p.map((v) => v.toFixed(3)).join('|')))
    expect(keys.size).toBe(points.length)
  })

  it('usa a face declarada em ZONE_PIN_FACE (painel traseiro aponta para -Z)', () => {
    const b = zoneBounds('Mainback')!
    for (const p of pinPositionsForZone('Mainback', 4)) {
      expect(p[2]).toBeLessThan(b.min[2])
    }
    const knobs = zoneBounds('CT Knobs')!
    for (const p of pinPositionsForZone('CT Knobs', 4)) {
      expect(p[2]).toBeGreaterThan(knobs.max[2])
    }
  })

  it('zonas diferentes ficam em regiões diferentes da cena', () => {
    const [ipc] = pinPositionsForZone('IPC Comp', 1)
    const [knobs] = pinPositionsForZone('CT Knobs', 1)
    expect(ipc).not.toEqual(knobs)
  })
})

describe('zoneBounds', () => {
  it('cobre os 5 meshes de CT Knobs numa única caixa', () => {
    const b = zoneBounds('CT Knobs')
    expect(b).not.toBeNull()
    if (!b) return
    expect(b.min[0]).toBeLessThan(-8)
    expect(b.max[0]).toBeGreaterThan(8)
  })
})
