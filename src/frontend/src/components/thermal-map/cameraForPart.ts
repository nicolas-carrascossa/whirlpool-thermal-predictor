/**
 * "Câmera segue a peça alterada" (Fase 1d, etapa E) — mapeamento puro de qual
 * peça alterada deve levar a qual preset de câmera/abertura. Fica fora de
 * `ThermalMap3D.tsx` para poder ser testado sem montar a cena 3D.
 */

import type { OpeningState } from './StoveContext'
import type { CameraPreset } from './ThermalMapScene'
import type { PartId } from './parts'

export interface CameraForPartResult {
  preset: CameraPreset
  /** Aberturas que devem ficar ligadas para a peça ficar visível no preset. */
  openings?: Partial<OpeningState>
}

/**
 * - `housing-lid` / `blower` / `deflector` / `control-board`: eletrônica do
 *   console → preset `console` com a tampa aberta.
 * - `coil-support` / `oven-glow`: dentro do forno → preset `front` com a
 *   porta do forno aberta.
 * - `cooktop-load`: superfície do cooktop → preset `iso`, visível sem abrir nada.
 */
export function cameraForPart(part: PartId): CameraForPartResult {
  switch (part) {
    case 'housing-lid':
    case 'blower':
    case 'deflector':
    case 'control-board':
      return { preset: 'console', openings: { console: true } }
    case 'coil-support':
    case 'oven-glow':
      return { preset: 'front', openings: { oven: true } }
    case 'cooktop-load':
      return { preset: 'iso' }
    default:
      return { preset: 'iso' }
  }
}
