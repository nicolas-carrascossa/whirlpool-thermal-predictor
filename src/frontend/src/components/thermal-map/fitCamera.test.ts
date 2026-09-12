import { describe, expect, it } from 'vitest'

import {
  boundingRadius,
  cameraPlacement,
  cameraPlacementForBounds,
  directionFromAngles,
  fitDistanceForRadius,
} from './fitCamera'
import { STOVE_BOUNDS } from './zoneGeometry'

const CENTER = { x: 0, y: 0, z: 0 }

describe('fitDistanceForRadius', () => {
  it('cresce com o raio da caixa', () => {
    const small = fitDistanceForRadius(5)
    const big = fitDistanceForRadius(20)
    expect(big).toBeGreaterThan(small)
    // proporcional: dobrar o raio dobra a distância
    expect(fitDistanceForRadius(10) / small).toBeCloseTo(2, 6)
  })

  it('cresce com a margem', () => {
    expect(fitDistanceForRadius(10, { margin: 1.4 })).toBeGreaterThan(fitDistanceForRadius(10, { margin: 1.0 }))
  })

  it('usa a abertura horizontal quando o viewport é mais estreito que alto', () => {
    const wide = fitDistanceForRadius(10, { aspect: 2 })
    const narrow = fitDistanceForRadius(10, { aspect: 0.6 })
    expect(narrow).toBeGreaterThan(wide)
  })

  it('afasta a câmera quando a abertura (fov) diminui', () => {
    expect(fitDistanceForRadius(10, { fovDeg: 20 })).toBeGreaterThan(fitDistanceForRadius(10, { fovDeg: 50 }))
  })
})

describe('cameraPlacement', () => {
  it('respeita a elevação: a altura é distância × sen(elevação)', () => {
    const p = cameraPlacement(CENTER, { x: 10, y: 10, z: 10 }, { azimuthDeg: 0, elevationDeg: 30 })
    expect(p.position[1]).toBeCloseTo(p.distance * Math.sin((30 * Math.PI) / 180), 6)
  })

  it('respeita o azimute: 0° = de frente (+Z), 90° = da direita (+X)', () => {
    const front = cameraPlacement(CENTER, { x: 10, y: 10, z: 10 }, { azimuthDeg: 0, elevationDeg: 0 })
    expect(front.position[0]).toBeCloseTo(0, 6)
    expect(front.position[2]).toBeGreaterThan(0)

    const right = cameraPlacement(CENTER, { x: 10, y: 10, z: 10 }, { azimuthDeg: 90, elevationDeg: 0 })
    expect(right.position[0]).toBeGreaterThan(0)
    expect(right.position[2]).toBeCloseTo(0, 6)
  })

  it('padrão é a isométrica ¾ frontal-direita, um pouco acima', () => {
    const p = cameraPlacement(CENTER, { x: 10, y: 10, z: 10 })
    expect(p.position[0]).toBeGreaterThan(0) // à direita
    expect(p.position[2]).toBeGreaterThan(0) // à frente
    expect(p.position[1]).toBeGreaterThan(0) // acima
    expect(p.position[2]).toBeGreaterThan(p.position[0]) // mais frontal que lateral
  })

  it('mira no centro da caixa', () => {
    const p = cameraPlacement({ x: 2, y: 5, z: -1 }, { x: 8, y: 8, z: 8 })
    expect(p.target).toEqual([2, 5, -1])
  })

  it('mantém a distância igual ao raio pedido pela geometria', () => {
    const size = { x: 26, y: 24, z: 18 }
    const p = cameraPlacement(CENTER, size, { margin: 1.15, aspect: 4 / 3, fovDeg: 38 })
    expect(p.distance).toBeCloseTo(fitDistanceForRadius(boundingRadius(size), { margin: 1.15 }), 6)
  })
})

describe('directionFromAngles', () => {
  it('devolve sempre um vetor unitário', () => {
    for (const [az, el] of [
      [0, 0],
      [35, 22],
      [180, 14],
      [-90, 45],
    ]) {
      const [x, y, z] = directionFromAngles(az, el)
      expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(1, 6)
    }
  })
})

describe('cameraPlacementForBounds (fogão inteiro)', () => {
  it('enquadra a caixa do fogão com o fogão inteiro à frente da câmera', () => {
    const p = cameraPlacementForBounds(STOVE_BOUNDS.min, STOVE_BOUNDS.max, { aspect: 600 / 450 })
    // o alvo é o centro da caixa, entre o chão e o topo do console
    expect(p.target[1]).toBeGreaterThan(STOVE_BOUNDS.min[1])
    expect(p.target[1]).toBeLessThan(STOVE_BOUNDS.max[1])
    // a distância cobre a meia-diagonal com folga
    const radius = boundingRadius({
      x: STOVE_BOUNDS.max[0] - STOVE_BOUNDS.min[0],
      y: STOVE_BOUNDS.max[1] - STOVE_BOUNDS.min[1],
      z: STOVE_BOUNDS.max[2] - STOVE_BOUNDS.min[2],
    })
    expect(p.distance).toBeGreaterThan(radius)
  })

  it('um card mais estreito afasta mais a câmera que um card largo', () => {
    const card = cameraPlacementForBounds(STOVE_BOUNDS.min, STOVE_BOUNDS.max, { aspect: 600 / 450 })
    const narrow = cameraPlacementForBounds(STOVE_BOUNDS.min, STOVE_BOUNDS.max, { aspect: 0.8 })
    expect(narrow.distance).toBeGreaterThan(card.distance)
  })
})
