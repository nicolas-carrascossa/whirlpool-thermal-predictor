import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PartId } from './parts'
import { PART_CALLOUT_FADE_MS, PART_CALLOUT_MS, usePartCallout } from './usePartCallout'

function setup() {
  return renderHook(({ part }) => usePartCallout(part), { initialProps: { part: null as PartId | null } })
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('usePartCallout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mostra o rótulo ao pulsar uma peça, desvanece e some sozinho', () => {
    const { result, rerender } = setup()
    expect(result.current).toEqual({ shown: null, visible: false })

    rerender({ part: 'deflector' })
    expect(result.current).toEqual({ shown: 'deflector', visible: true })

    advance(PART_CALLOUT_MS)
    expect(result.current).toEqual({ shown: 'deflector', visible: false })

    advance(PART_CALLOUT_FADE_MS)
    expect(result.current).toEqual({ shown: null, visible: false })
  })

  it('some mesmo que a store zere o pulso antes do fim do ciclo (antes, o rótulo ficava preso)', () => {
    const { result, rerender } = setup()
    rerender({ part: 'deflector' }) // clique numa linha de "Configuração selecionada"
    advance(1100)
    rerender({ part: null }) // a store zera `highlightPart` ~1,1 s depois do pulso

    // ainda dentro do ciclo: continua visível
    expect(result.current).toEqual({ shown: 'deflector', visible: true })

    advance(60_000)
    expect(result.current).toEqual({ shown: null, visible: false })
  })

  it('um rótulo novo substitui o anterior e reinicia o ciclo', () => {
    const { result, rerender } = setup()
    rerender({ part: 'deflector' })
    advance(1500)
    rerender({ part: 'blower' })
    expect(result.current).toEqual({ shown: 'blower', visible: true })

    // 1500 ms depois do segundo pulso o primeiro ciclo já teria vencido; o novo, não.
    advance(1500)
    expect(result.current).toEqual({ shown: 'blower', visible: true })

    advance(PART_CALLOUT_MS + PART_CALLOUT_FADE_MS)
    expect(result.current).toEqual({ shown: null, visible: false })
  })

  it('desmontar cancela os temporizadores', () => {
    const { rerender, unmount } = setup()
    rerender({ part: 'blower' })
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
