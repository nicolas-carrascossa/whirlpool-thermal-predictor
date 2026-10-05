import { useEffect, useRef, useState } from 'react'

import type { PartId } from './parts'

/** Duração do callout da peça alterada, em ms. */
export const PART_CALLOUT_MS = 2000
/** Duração do desvanecimento ao sumir, em ms. */
export const PART_CALLOUT_FADE_MS = 400

/**
 * Ciclo de vida do rótulo temporário "Peça → valor": aparece quando uma peça
 * passa a pulsar (`highlightPart`), fica `PART_CALLOUT_MS`, desvanece e some.
 *
 * Os temporizadores vivem em refs, e NÃO no cleanup do efeito. A store zera
 * `highlightPart` ~1,1 s depois do pulso; se o cleanup do efeito cancelasse os
 * temporizadores, esse retorno a `null` (que acontece antes dos 2 s) os mataria
 * e o rótulo ficaria na tela para sempre, só trocando quando outra peça
 * pulsasse. Aqui `null` não faz nada: o rótulo termina o seu próprio ciclo.
 */
export function usePartCallout(highlightPart: PartId | null): { shown: PartId | null; visible: boolean } {
  const [shown, setShown] = useState<PartId | null>(null)
  const [visible, setVisible] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!highlightPart) return
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    if (clearTimer.current) clearTimeout(clearTimer.current)
    setShown(highlightPart)
    setVisible(true)
    fadeTimer.current = setTimeout(() => setVisible(false), PART_CALLOUT_MS)
    clearTimer.current = setTimeout(() => setShown(null), PART_CALLOUT_MS + PART_CALLOUT_FADE_MS)
  }, [highlightPart])

  // Só ao desmontar (inclusive ao reiniciar o mapa, que remonta o callout).
  useEffect(
    () => () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
      if (clearTimer.current) clearTimeout(clearTimer.current)
    },
    [],
  )

  return { shown, visible }
}
