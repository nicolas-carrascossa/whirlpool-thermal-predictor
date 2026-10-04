/**
 * Fase 1d, etapa C: clicar num pino de sensor no mapa 3D volta para a aba de
 * resultados, expande o card da área, rola a linha do sensor até o centro e a
 * destaca por ~1,5 s.
 *
 * O `<ThermalMap3D>` (WebGL) é substituído por um stub que expõe a prop
 * `onSelectSensor` como um botão — é exatamente o mesmo caminho que o pino
 * percorre, sem precisar de canvas.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ThermalMap3DProps } from '@/components/thermal-map/ThermalMap3D'
import { ResultsPanel, type ResultsTab } from '@/features/results/ResultsPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'
import { renderWithQuery } from '@/test/queryWrapper'

vi.mock('@/components/thermal-map/ThermalMap3D', () => ({
  ThermalMap3D: (props: ThermalMap3DProps) => (
    <button type="button" data-testid="pin-igbt-1" onClick={() => props.onSelectSensor?.(1)}>
      pino IGBT 1
    </button>
  ),
}))

/** A seção ativa é do pai (a barra lateral); o teste começa no mapa, como o usuário. */
function Harness() {
  const [tab, setTab] = useState<ResultsTab>('mapa')
  return (
    <ResultsPanel
      metadata={FIXTURE_METADATA}
      response={FIXTURE_RESPONSE}
      isLoading={false}
      error={null}
      hasRequest
      activeTab={tab}
      onTabChange={setTab}
    />
  )
}

describe('pino de sensor → linha da tabela', () => {
  it('volta para a aba de resultados, rola e destaca a linha do sensor clicado, e o destaque some depois', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    const { container } = renderWithQuery(<Harness />)

    const pin = await screen.findByTestId('pin-igbt-1')
    const row = () => container.querySelector('[data-tc-number="1"]')
    expect(row()).not.toBeInTheDocument()

    fireEvent.click(pin)

    expect(screen.queryByTestId('pin-igbt-1')).not.toBeInTheDocument()
    await waitFor(() => expect(row()).toHaveAttribute('data-flash', 'true'))
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ block: 'center' })

    await waitFor(() => expect(row()).not.toHaveAttribute('data-flash'), { timeout: 3000 })
    // Sem timeout próprio: este teste usa timers reais e espera o destaque de
    // ~1,5 s expirar, então precisa de mais folga que o padrão do Vitest — e
    // quem define essa folga é `testTimeout` no vite.config.ts. Um valor fixo
    // aqui SOBRESCREVE o global e volta a estourar sob carga, que foi
    // exatamente o que acontecia com os 10 s que ficavam nesta linha.
  })
})
