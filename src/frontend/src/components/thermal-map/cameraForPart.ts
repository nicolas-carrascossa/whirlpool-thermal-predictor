/**
 * "Câmera segue a peça alterada" (Fase 1d, etapa E) e "ir até a peça" (clique
 * numa variável de "Configuração selecionada") — mapeamento puro de qual peça
 * leva a qual preset de câmera/abertura e a qual região do fogão enquadrar.
 * Fica fora de `ThermalMap3D.tsx` para poder ser testado sem montar a cena 3D.
 */

import { BOARD_RIGHT_OFFSET_X, type PartId } from './parts'
import type { ExplodeLayerId } from './explode'
import type { OpeningState } from './StoveContext'
import type { CameraPreset } from './ThermalMapScene'
import { BLOWER, BODY, CAVITY, COIL, CONSOLE_LIFT, DEFLECTOR, HOUSING, type Bounds } from './zoneGeometry'

/**
 * Região do fogão em que a peça fica: a câmera é levada até ela (centro da
 * caixa) e se aproxima o bastante para a caixa preencher a tela.
 */
export interface PartFocus {
  /** Caixa da região, em unidades de cena (fogão fechado). */
  bounds: Bounds
  azimuthDeg: number
  elevationDeg: number
  /** Folga em volta da caixa (1 = encostando nas bordas). */
  margin: number
  /** Camada da vista explodida que a região acompanha: sobe junto com ela. */
  layer?: ExplodeLayerId
}

export interface CameraForPartResult {
  preset: CameraPreset
  /** Aberturas que devem ficar ligadas para a peça ficar visível no preset. */
  openings?: Partial<OpeningState>
  /** Região da peça: o enquadramento de "ir até a peça" usa isto, não o preset. */
  focus: PartFocus
}

/** Caixa de centro `c` e meia-extensão `h` em cada eixo. */
function around(c: [number, number, number], h: [number, number, number]): Bounds {
  return {
    min: [c[0] - h[0], c[1] - h[1], c[2] - h[2]],
    max: [c[0] + h[0], c[1] + h[1], c[2] + h[2]],
  }
}

/**
 * Mesma direção do preset "Console" (a que o desenho da baía foi pensado para
 * ser visto), só que centrada na peça e bem mais próxima.
 */
const BAY_VIEW = { azimuthDeg: 18, elevationDeg: 38, margin: 1.5, layer: 'bay' } as const

/** Onde cada peça fica. Os centros e as dimensões vêm de `zoneGeometry.ts`. */
const FOCUS: Record<PartId, PartFocus> = {
  'housing-lid': {
    ...BAY_VIEW,
    bounds: around(
      [HOUSING.x, HOUSING.y, HOUSING.z],
      [HOUSING.w / 2 + 1.2, HOUSING.h / 2 + 1.6, HOUSING.d / 2 + 1.2],
    ),
  },
  // A placa anda para a direita com `board_position = Right`: a caixa cobre as duas posições.
  'control-board': {
    ...BAY_VIEW,
    bounds: around(
      [HOUSING.x - 1.6 + BOARD_RIGHT_OFFSET_X / 2, HOUSING.y - 1.2, HOUSING.z],
      [2.2 + BOARD_RIGHT_OFFSET_X / 2 + 0.8, 1.8, 2.2],
    ),
  },
  blower: {
    ...BAY_VIEW,
    bounds: around(
      [BLOWER.x, BLOWER.y, BLOWER.z],
      [BLOWER.radius + 1.6, BLOWER.radius + 1.0, BLOWER.radius + 1.6],
    ),
  },
  deflector: {
    ...BAY_VIEW,
    bounds: around(
      [DEFLECTOR.x, DEFLECTOR.y, DEFLECTOR.z],
      [DEFLECTOR.d / 2 + 2.4, DEFLECTOR.h / 2 + 1.4, DEFLECTOR.d / 2 + 2.2],
    ),
  },
  // Dentro do forno, vista de frente com a porta aberta.
  'coil-support': {
    azimuthDeg: 0,
    elevationDeg: 20,
    margin: 1.4,
    bounds: around([0, COIL.y - 0.4, COIL.z], [COIL.radius + 2.2, 2.4, COIL.radius + 2.2]),
  },
  'oven-glow': {
    azimuthDeg: 0,
    elevationDeg: 14,
    margin: 1.2,
    bounds: around(
      [0, CAVITY.yCenter, CAVITY.zCenter],
      [CAVITY.w / 2 + 0.5, CAVITY.h / 2 + 0.5, CAVITY.d / 2],
    ),
  },
  // O cooktop pode estar levantado (`CONSOLE_LIFT`): a caixa cobre as duas alturas.
  'cooktop-load': {
    azimuthDeg: 20,
    elevationDeg: 42,
    margin: 1.3,
    layer: 'glass',
    bounds: {
      min: [-(BODY.w / 2 - 1), 11, -6],
      max: [BODY.w / 2 - 1, 12 + CONSOLE_LIFT + 3, 8.5],
    },
  },
}

/**
 * - `housing-lid` / `blower` / `deflector` / `control-board`: eletrônica na
 *   baía sob o cooktop → preset `console` (enquadra o andar de cima) com o
 *   cooktop levantado (chave `console`).
 * - `coil-support` / `oven-glow`: dentro do forno → preset `front` com a
 *   porta do forno aberta.
 * - `cooktop-load`: superfície do cooktop → preset `iso`, visível sem abrir nada.
 *
 * `focus` é a região exata de cada peça (ver `FOCUS`).
 */
export function cameraForPart(part: PartId): CameraForPartResult {
  const focus = FOCUS[part] ?? FOCUS['cooktop-load']
  switch (part) {
    case 'housing-lid':
    case 'blower':
    case 'deflector':
    case 'control-board':
      return { preset: 'console', openings: { console: true }, focus }
    case 'coil-support':
    case 'oven-glow':
      return { preset: 'front', openings: { oven: true }, focus }
    case 'cooktop-load':
      return { preset: 'iso', focus }
    default:
      return { preset: 'iso', focus }
  }
}
