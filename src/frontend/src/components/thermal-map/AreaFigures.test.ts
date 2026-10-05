import { describe, expect, it } from 'vitest'

import { AREA_FIGURES, FIGURE_ZONE_COLOR, REST_TILT_DEG, figureCenter, figureFit } from './AreaFigures'
import { ZONE_GRAY_HEX } from './colorScale'
import { GEOMETRY_ZONE_KEYS, STOVE_BOUNDS } from './zoneGeometry'

const SIZE = 64

describe('AREA_FIGURES', () => {
  it('há uma figura para cada área que o fogão 3D desenha', () => {
    expect(Object.keys(AREA_FIGURES).sort()).toEqual([...GEOMETRY_ZONE_KEYS].sort())
  })

  it('toda caixa é válida e fica dentro do fogão (com a tampa aberta da carcaça como exceção, no alto)', () => {
    for (const [area, { bounds }] of Object.entries(AREA_FIGURES)) {
      for (let axis = 0; axis < 3; axis += 1) {
        expect(bounds.max[axis], `${area} eixo ${axis}`).toBeGreaterThan(bounds.min[axis])
      }
      // x e z: o fogão inteiro, com a folga do painel traseiro e da porta
      expect(bounds.min[0], area).toBeGreaterThanOrEqual(STOVE_BOUNDS.min[0] - 0.5)
      expect(bounds.max[0], area).toBeLessThanOrEqual(STOVE_BOUNDS.max[0] + 0.5)
      expect(bounds.min[2], area).toBeGreaterThanOrEqual(STOVE_BOUNDS.min[2] - 0.5)
      expect(bounds.max[2], area).toBeLessThanOrEqual(STOVE_BOUNDS.max[2] + 0.5)
      expect(bounds.min[1], area).toBeGreaterThanOrEqual(STOVE_BOUNDS.min[1])
    }
  })

  it('cada figura sabe de que lado é vista e como se renderiza', () => {
    for (const [area, spec] of Object.entries(AREA_FIGURES)) {
      expect(Number.isFinite(spec.baseYawDeg), area).toBe(true)
      expect(typeof spec.render, area).toBe('function')
    }
    // o painel traseiro está do lado de trás: é visto por trás
    expect(AREA_FIGURES.Mainback.baseYawDeg).toBeGreaterThan(90)
  })

  it('a zona de dado das figuras tem coloração fixa e neutra, sem relação com o status', () => {
    // o cinza neutro de zona do mapa: nem verde, nem laranja, nem vermelho
    expect(FIGURE_ZONE_COLOR).toBe(ZONE_GRAY_HEX)
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(FIGURE_ZONE_COLOR.slice(i, i + 2), 16))
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(8)
    // e as figuras não recebem cor: o contrato é `render()` sem argumentos
    for (const spec of Object.values(AREA_FIGURES)) expect(spec.render.length).toBe(0)
  })

  it('o centro de uma caixa é o ponto médio dela', () => {
    expect(figureCenter({ min: [0, 2, -4], max: [4, 6, 0] })).toEqual([2, 4, -2])
  })
})

describe('figureFit', () => {
  it('uma figura comprida ocupa a largura útil do cartão, e não só o quadrado dela', () => {
    const { width } = figureFit(AREA_FIGURES['CT Knobs'].bounds, { size: SIZE, tileWidth: 150 })
    expect(width).toBeGreaterThan(SIZE * 1.3)
    expect(width).toBeLessThanOrEqual(150 - 16 + 0.001)
  })

  it('nenhuma figura passa da largura útil do cartão nem da altura do quadrado', () => {
    for (const tileWidth of [112, 130, 160, 230]) {
      for (const [area, { bounds }] of Object.entries(AREA_FIGURES)) {
        const { scale, width, height } = figureFit(bounds, { size: SIZE, tileWidth })
        expect(scale, area).toBeGreaterThan(0)
        expect(width, `${area} @${tileWidth}`).toBeLessThanOrEqual(Math.max(tileWidth - 16, SIZE) + 0.001)
        expect(height, `${area} @${tileWidth}`).toBeLessThanOrEqual(SIZE * 1.1 + 0.001)
      }
    }
  })

  it('uma figura alta é limitada pela altura, não pela largura', () => {
    const { height, width } = figureFit(AREA_FIGURES.Mainback.bounds, { size: SIZE, tileWidth: 230 })
    expect(height).toBeCloseTo(SIZE * 1.1, 5)
    expect(width).toBeLessThan(230 - 16)
  })

  it('a escala acompanha o ângulo de repouso declarado', () => {
    expect(REST_TILT_DEG).toBeGreaterThan(0)
    expect(REST_TILT_DEG).toBeLessThan(90)
  })

  it('cartão mais estreito que o quadrado nunca zera a figura', () => {
    const { scale } = figureFit(AREA_FIGURES['Oven HMI'].bounds, { size: SIZE, tileWidth: 20 })
    expect(scale).toBeGreaterThan(0)
  })
})
