/**
 * Anotações da cena — Fase 1d, etapas A e C.
 *
 * - `OrientationMarkers`: "Frente" e "Traseira" no chão, para orientar quem
 *   nunca viu o modelo (cinza, pequenos, sem interação).
 * - `PartChangeCallout`: rótulo temporário "Peça → valor" junto da peça que
 *   acabou de mudar. Usa o mesmo gatilho do pulso (`highlightPart`) e some
 *   sozinho depois de ~2 s — o ciclo vive em `usePartCallout`, não na store.
 */

import { Html } from '@react-three/drei'

import { PART_ANCHOR, PART_LABEL_PT, PART_TO_VARIABLE } from './parts'
import { useStove } from './StoveContext'
import { PART_CALLOUT_FADE_MS, usePartCallout } from './usePartCallout'
import { BODY_BACK, BODY_FRONT, FLOOR_Y_BOUND } from './zoneGeometry'

const markerClass =
  'select-none whitespace-nowrap font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-wp-gray45'

export function OrientationMarkers() {
  return (
    <group>
      <Html
        position={[0, FLOOR_Y_BOUND + 0.05, BODY_FRONT + 7]}
        center
        zIndexRange={[4, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span className={markerClass}>Frente</span>
      </Html>
      <Html
        position={[0, FLOOR_Y_BOUND + 0.05, BODY_BACK - 7]}
        center
        zIndexRange={[4, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span className={markerClass}>Traseira</span>
      </Html>
    </group>
  )
}

export function PartChangeCallout() {
  const { highlightPart, config } = useStove()
  const { shown, visible } = usePartCallout(highlightPart)

  if (!shown) return null
  const value = config[PART_TO_VARIABLE[shown]]

  return (
    <Html
      position={PART_ANCHOR[shown]}
      center
      zIndexRange={[26, 16]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        data-testid="part-callout"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${PART_CALLOUT_FADE_MS}ms ease-out` }}
        className="whitespace-nowrap rounded-md border border-wp-accent bg-wp-accentLt px-2 py-1 font-body text-[12px] font-semibold text-wp-core shadow-sm"
      >
        {PART_LABEL_PT[shown]} → {value}
      </div>
    </Html>
  )
}
