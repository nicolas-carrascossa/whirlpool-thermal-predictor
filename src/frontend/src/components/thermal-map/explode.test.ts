import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EXPLODE_AMOUNT,
  EXPLODE_LIFT,
  EXPLODE_MAX_LIFT,
  EXPLODE_REAR_PUSH,
  explodeLiftFor,
  framingBoundsFor,
  layerLiftFor,
  rearPushFor,
} from './explode'
import {
  BAY,
  BAY_ZONE_KEYS,
  BODY,
  BODY_BACK,
  BODY_FRONT,
  BODY_TOP,
  BURNER_SLOTS,
  CONSOLE,
  COOKTOP_ELEMENTS,
  DOOR_TOP,
  HMI_SCREEN,
  REAR_ZONE_KEYS,
  STOVE_BOUNDS,
  TOP_ZONE_KEYS,
  ZONE_MESHES,
  zoneBounds,
} from './zoneGeometry'

describe('vista explodida — camadas', () => {
  it('as camadas sobem em ordem crescente de baixo para cima', () => {
    expect(EXPLODE_LIFT.bay).toBeLessThan(EXPLODE_LIFT.tray)
    expect(EXPLODE_LIFT.tray).toBeLessThan(EXPLODE_LIFT.elements)
    expect(EXPLODE_LIFT.elements).toBeLessThan(EXPLODE_LIFT.glass)
    expect(EXPLODE_MAX_LIFT).toBe(EXPLODE_LIFT.glass)
  })

  it('o afastamento é proporcional ao fator e limitado a 0–100', () => {
    expect(layerLiftFor('glass', 0)).toBe(0)
    expect(layerLiftFor('glass', 50)).toBeCloseTo(EXPLODE_LIFT.glass / 2, 6)
    expect(layerLiftFor('glass', 100)).toBe(EXPLODE_LIFT.glass)
    expect(layerLiftFor('bay', 250)).toBe(EXPLODE_LIFT.bay)
    expect(explodeLiftFor(-10)).toBe(0)
    expect(DEFAULT_EXPLODE_AMOUNT).toBeGreaterThan(0)
    expect(DEFAULT_EXPLODE_AMOUNT).toBeLessThanOrEqual(100)
  })

  it('o enquadramento cresce em Y (cooktop sobe) e para trás (painel traseiro recua), só com explosão', () => {
    expect(framingBoundsFor(STOVE_BOUNDS, 0)).toBe(STOVE_BOUNDS)
    const exploded = framingBoundsFor(STOVE_BOUNDS, 100)
    expect(exploded.min[0]).toBe(STOVE_BOUNDS.min[0])
    expect(exploded.min[1]).toBe(STOVE_BOUNDS.min[1])
    expect(exploded.max[0]).toBe(STOVE_BOUNDS.max[0])
    expect(exploded.max[2]).toBe(STOVE_BOUNDS.max[2])
    expect(exploded.max[1]).toBeCloseTo(STOVE_BOUNDS.max[1] + EXPLODE_MAX_LIFT, 6)
    expect(exploded.min[2]).toBeCloseTo(STOVE_BOUNDS.min[2] - EXPLODE_REAR_PUSH, 6)
  })

  it('o painel traseiro recua na explosão, proporcional ao fator e limitado a 0–100', () => {
    expect(rearPushFor(0)).toBe(0)
    expect(rearPushFor(50)).toBeCloseTo(EXPLODE_REAR_PUSH / 2, 6)
    expect(rearPushFor(250)).toBe(EXPLODE_REAR_PUSH)
    expect(rearPushFor(-5)).toBe(0)
  })
})

describe('geometria — console fino e baía sob o cooktop', () => {
  it('o console é uma faixa (≤ 20 % da altura do corpo) e nenhuma boca fica sob ele', () => {
    expect(CONSOLE.yTop - CONSOLE.yBottom).toBeLessThanOrEqual(24 * 0.2)
    for (const [, z] of BURNER_SLOTS) {
      for (const el of COOKTOP_ELEMENTS) {
        // o anel inteiro fica à frente da face do console
        expect(z - el.radius).toBeGreaterThan(CONSOLE.zFront)
      }
    }
  })

  it('os botões cabem na faixa do console; a ventilação, na mesa', () => {
    const knobs = zoneBounds('CT Knobs')!
    expect(knobs.min[1]).toBeGreaterThanOrEqual(CONSOLE.yBottom)
    expect(knobs.max[1]).toBeLessThanOrEqual(CONSOLE.yTop)
    expect(TOP_ZONE_KEYS.has('CT Knobs')).toBe(true)
    const vent = zoneBounds('Main Vent Sys')!
    expect(vent.max[1]).toBeLessThan(BODY_TOP + 1)
    expect(vent.max[2]).toBeLessThan(BURNER_SLOTS[0][1] - COOKTOP_ELEMENTS[0].radius)
    expect(TOP_ZONE_KEYS.has('Main Vent Sys')).toBe(true)
  })

  it('a tela do forno fica na faixa frontal, entre a porta e o cooktop, e não sobe com o cooktop', () => {
    const hmi = zoneBounds('Oven HMI')!
    // acima da porta, abaixo do vidro do cooktop
    expect(hmi.min[1]).toBeGreaterThan(DOOR_TOP)
    expect(hmi.max[1]).toBeLessThan(BODY_TOP)
    // na face da frente do corpo, não no console traseiro
    expect(hmi.min[2]).toBeGreaterThanOrEqual(BODY_FRONT)
    // cabe na largura do corpo, folgada em relação às molduras laterais
    expect(hmi.min[0]).toBeGreaterThan(-BODY.w / 2)
    expect(hmi.max[0]).toBeLessThan(BODY.w / 2)
    // a lâmina de vidro que a envolve também cabe na faixa
    expect(HMI_SCREEN.y - HMI_SCREEN.glassH / 2).toBeGreaterThan(DOOR_TOP)
    expect(HMI_SCREEN.y + HMI_SCREEN.glassH / 2).toBeLessThan(BODY_TOP)
    // fica fixa no corpo: o cooktop se levanta, a tela da fachada não
    expect(TOP_ZONE_KEYS.has('Oven HMI')).toBe(false)
    expect(ZONE_MESHES.find((z) => z.zoneKey === 'Oven HMI')?.facade).toBe(true)
  })

  it('a eletrônica fica na baía entre o teto da cavidade e a bandeja do cooktop', () => {
    for (const key of ['IPC Comp', 'IPC Cooling']) {
      const b = zoneBounds(key)!
      expect(b.min[1]).toBeGreaterThanOrEqual(BAY.yBottom)
      expect(b.max[1]).toBeLessThanOrEqual(BAY.yTop)
      expect(BAY_ZONE_KEYS.has(key)).toBe(true)
    }
    // Coil Temps continua na cavidade do forno (não migrou para a pilha)
    expect(ZONE_MESHES.find((z) => z.zoneKey === 'Coil Temps')?.layer).toBeUndefined()
  })

  it('o Mainback é a face do painel traseiro: anda com ele, não fica no corpo nem no cooktop', () => {
    expect(REAR_ZONE_KEYS.has('Mainback')).toBe(true)
    expect(TOP_ZONE_KEYS.has('Mainback')).toBe(false)
    expect(BAY_ZONE_KEYS.has('Mainback')).toBe(false)
    // a zona assenta na face de trás do painel (BODY_BACK), nunca à frente dele
    expect(zoneBounds('Mainback')!.max[2]).toBeLessThanOrEqual(BODY_BACK)
  })

  it('as 7 zonas continuam existindo, com os mesmos zoneKey', () => {
    expect(new Set(ZONE_MESHES.map((z) => z.zoneKey))).toEqual(
      new Set(['CT Knobs', 'Oven HMI', 'Main Vent Sys', 'Mainback', 'IPC Comp', 'IPC Cooling', 'Coil Temps']),
    )
  })
})
