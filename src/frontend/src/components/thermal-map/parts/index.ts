/**
 * Registro de peças configuráveis do fogão 3D (Fase 1c, etapa B).
 *
 * `partStateFromConfig` é uma função **pura**: recebe a `StoveConfig` do
 * formulário e devolve dados simples (sem three.js) descrevendo como cada peça
 * deve estar. Os componentes 3D só interpolam até esse estado.
 */

import type { StoveConfig } from '@/contract/v1'
import { BLOWER, BURNER_SLOTS, CAVITY, COIL, DEFLECTOR, HOUSING } from '../zoneGeometry'

export type PartId =
  | 'housing-lid'
  | 'blower'
  | 'deflector'
  | 'control-board'
  | 'coil-support'
  | 'cooktop-load'
  | 'oven-glow'

export const PART_IDS: PartId[] = [
  'housing-lid',
  'blower',
  'deflector',
  'control-board',
  'coil-support',
  'cooktop-load',
  'oven-glow',
]

/** Variável do contrato → peça que a representa. `losses` não tem peça. */
export const VARIABLE_TO_PART: Record<keyof StoveConfig, PartId | null> = {
  housing: 'housing-lid',
  blower_direction: 'blower',
  deflector_hole: 'deflector',
  board_position: 'control-board',
  material_coil_support: 'coil-support',
  run_case: 'cooktop-load',
  losses: null,
}

/** Peça → variável que a controla (inverso de `VARIABLE_TO_PART`). */
export const PART_TO_VARIABLE: Record<PartId, keyof StoveConfig> = {
  'housing-lid': 'housing',
  blower: 'blower_direction',
  deflector: 'deflector_hole',
  'control-board': 'board_position',
  'coil-support': 'material_coil_support',
  'cooktop-load': 'run_case',
  'oven-glow': 'run_case',
}

/** Rótulo curto em pt-BR de cada peça (usado no tooltip e na legenda). */
export const PART_LABEL_PT: Record<PartId, string> = {
  'housing-lid': 'Carcaça da eletrônica',
  blower: 'Blower',
  deflector: 'Defletor de ar',
  'control-board': 'Placa eletrônica',
  'coil-support': 'Suporte da resistência',
  'cooktop-load': 'Carga do cooktop',
  'oven-glow': 'Cavidade do forno',
}

/**
 * Ponto da cena em que o callout "Peça → valor" (Fase 1d, etapa C) aparece
 * quando a peça é alterada. Coincide com a âncora do tooltip de cada peça.
 */
export const PART_ANCHOR: Record<PartId, [number, number, number]> = {
  'housing-lid': [HOUSING.x, HOUSING.y + 3.6, HOUSING.z],
  blower: [BLOWER.x, BLOWER.y + 3, BLOWER.z],
  deflector: [DEFLECTOR.x, DEFLECTOR.y + 3.8, DEFLECTOR.z],
  'control-board': [HOUSING.x, HOUSING.y - 3, HOUSING.z],
  'coil-support': [0, COIL.y - 2.8, COIL.z],
  'cooktop-load': [0, 17.2, 3],
  'oven-glow': [0, CAVITY.yCenter + 5, CAVITY.zCenter],
}

export type CoilSupportPreset = 'aluminium' | 'aluminium-plate' | 'plastic'

export interface CooktopLoadItem {
  kind: 'pan' | 'griddle'
  /** Índices de `BURNER_SLOTS` cobertos pela peça. */
  slots: number[]
}

export interface PartState {
  lid: {
    /** `true` para `Open` e `Open - Updated`. */
    open: boolean
    /** `true` só para `Open - Updated` (rasgos de ventilação na caixa). */
    vented: boolean
  }
  board: {
    /** Deslocamento em X, em unidades de cena, a partir da posição central. */
    offsetX: number
    position: 'center' | 'right'
  }
  blower: {
    direction: 'front' | 'back'
    /** Sentido do eixo Z do fluxo principal: +1 = para a frente. */
    axisZ: 1 | -1
  }
  deflector: {
    /** `true` quando o furo está aberto. */
    hole: boolean
    /** Fração das setas que se desvia para a carcaça do IPC (0 quando fechado). */
    branchFraction: number
  }
  coilSupport: {
    preset: CoilSupportPreset
  }
  cooktop: {
    loads: CooktopLoadItem[]
    /** Índices de `BURNER_SLOTS` com queimador aceso. */
    litSlots: number[]
  }
  ovenGlow: {
    /** Setpoint do forno em °C, conforme o `run_case`. */
    setpointC: number
    /** 0…1, proporcional ao setpoint (400 °C = 1). */
    intensity: number
  }
}

const OVEN_SETPOINT_C: Record<string, number> = {
  Pyro: 400,
  'Broil C1': 280,
  'Broil C2': 280,
  'Broil Qualitative': 280,
}

const ALL_SLOTS = BURNER_SLOTS.map((_, i) => i)

/**
 * Carga do cooktop por modo de operação.
 * - Pyro: cooktop desligado e vazio.
 * - Broil C2: chapa sobre o par esquerdo + 2 panelas à direita.
 * - Broil Qualitative: 4 panelas.
 * - Broil C1: 3 panelas + 1 chapa (chapa de um queimador só, para caber nos 4).
 */
function cooktopFor(runCase: string): PartState['cooktop'] {
  switch (runCase) {
    case 'Broil C2':
      return {
        loads: [
          { kind: 'griddle', slots: [0, 1] },
          { kind: 'pan', slots: [2] },
          { kind: 'pan', slots: [3] },
        ],
        litSlots: ALL_SLOTS,
      }
    case 'Broil Qualitative':
      return {
        loads: ALL_SLOTS.map((s) => ({ kind: 'pan' as const, slots: [s] })),
        litSlots: ALL_SLOTS,
      }
    case 'Broil C1':
      return {
        loads: [
          { kind: 'griddle', slots: [0] },
          { kind: 'pan', slots: [1] },
          { kind: 'pan', slots: [2] },
          { kind: 'pan', slots: [3] },
        ],
        litSlots: ALL_SLOTS,
      }
    default: // Pyro e qualquer valor desconhecido
      return { loads: [], litSlots: [] }
  }
}

function coilPresetFor(material: string): CoilSupportPreset {
  if (material === 'Plastic') return 'plastic'
  if (material === 'Aluminium Plate') return 'aluminium-plate'
  return 'aluminium'
}

/** Deslocamento em X da placa quando `board_position = "Right"`. */
export const BOARD_RIGHT_OFFSET_X = 2.6
/** Fração das setas de ar que se desvia para o IPC com o furo aberto (H1). */
export const DEFLECTOR_BRANCH_FRACTION = 0.4

/**
 * Traduz a configuração do fogão no estado visual das peças. Pura e
 * determinística — valores desconhecidos caem no padrão da referência.
 */
export function partStateFromConfig(config: StoveConfig): PartState {
  const housing = config.housing
  const open = housing === 'Open' || housing === 'Open - Updated'
  const toFront = config.blower_direction !== 'To back'
  const hole = config.deflector_hole === 'Open'
  const right = config.board_position === 'Right'
  const runCase = config.run_case
  const setpointC = OVEN_SETPOINT_C[runCase] ?? 280

  return {
    lid: { open, vented: housing === 'Open - Updated' },
    board: { offsetX: right ? BOARD_RIGHT_OFFSET_X : 0, position: right ? 'right' : 'center' },
    blower: { direction: toFront ? 'front' : 'back', axisZ: toFront ? 1 : -1 },
    deflector: { hole, branchFraction: hole ? DEFLECTOR_BRANCH_FRACTION : 0 },
    coilSupport: { preset: coilPresetFor(config.material_coil_support) },
    cooktop: cooktopFor(runCase),
    ovenGlow: { setpointC, intensity: setpointC / 400 },
  }
}

/** Configuração de referência usada quando `config` não é informada ao mapa. */
export const FALLBACK_CONFIG: StoveConfig = {
  blower_direction: 'To front',
  housing: 'Closed',
  board_position: 'Center',
  run_case: 'Pyro',
  losses: 'No losses',
  deflector_hole: 'Closed',
  material_coil_support: 'Aluminium',
}
