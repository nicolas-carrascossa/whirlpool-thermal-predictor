/**
 * Fase 1d, etapa C: clicar num pino de sensor no mapa 3D expande o card da
 * área, rola a linha do sensor até o centro e a destaca por ~1,5 s.
 *
 * O `<ThermalMap3D>` (WebGL) é substituído por um stub que expõe a prop
 * `onSelectSensor` como um botão — é exatamente o mesmo caminho que o pino
 * percorre, sem precisar de canvas.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ThermalMap3DProps } from '@/components/thermal-map/ThermalMap3D'
import { ResultsPanel } from '@/features/results/ResultsPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

vi.mock('@/components/thermal-map/ThermalMap3D', () => ({
  ThermalMap3D: (props: ThermalMap3DProps) => (
    <button type="button" data-testid="pin-igbt-1" onClick={() => props.onSelectSensor?.(1)}>
      pino IGBT 1
    </button>
  ),
}))

describe('pino de sensor → linha da tabela', () => {
  it('rola e destaca a linha do sensor clicado, e o destaque some depois', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    const { container } = render(
      <ResultsPanel
        metadata={FIXTURE_METADATA}
        response={FIXTURE_RESPONSE}
        isLoading={false}
        error={null}
        hasRequest
      />,
    )

    const pin = await screen.findByTestId('pin-igbt-1')
    const row = () => container.querySelector('[data-tc-number="1"]')
    expect(row()).toBeInTheDocument()
    expect(row()).not.toHaveAttribute('data-flash')

    fireEvent.click(pin)

    await waitFor(() => expect(row()).toHaveAttribute('data-flash', 'true'))
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ block: 'center' })

    await waitFor(() => expect(row()).not.toHaveAttribute('data-flash'), { timeout: 3000 })
  }, 10000)
})
