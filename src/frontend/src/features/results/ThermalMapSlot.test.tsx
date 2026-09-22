/**
 * Testes de integração da Fase 1c, etapa C: o rascunho do formulário
 * (`ConfigPanel`) alimenta o `<ThermalMap3D>` (mockado — não renderiza WebGL)
 * em tempo real via `ThermalMapSlot`, sem precisar de "Prever".
 *
 * Usa temporizadores reais (em vez de fake timers) porque o fluxo passa por
 * `findByRole`/estado assíncrono do Radix Select — misturar isso com fake
 * timers trava a espera dos testes.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import type { ThermalMap3DProps } from '@/components/thermal-map/ThermalMap3D'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { ConfigPanel } from '@/features/config/ConfigPanel'
import { ThermalMapSlot } from '@/features/results/ThermalMapSlot'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

vi.mock('@/components/thermal-map/ThermalMap3D', () => ({
  ThermalMap3D: (props: ThermalMap3DProps) => (
    <div
      data-testid="thermal-map-stub"
      data-config={JSON.stringify(props.config)}
      data-highlight={props.highlightPart ?? ''}
    />
  ),
}))

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function Harness() {
  const store = useConfigStore()
  return (
    <>
      <ConfigPanel />
      <ThermalMapSlot
        metadata={store.metadata}
        response={FIXTURE_RESPONSE}
        referenceResponse={undefined}
        isReferenceConfig={false}
        mode="absolute"
        onModeChange={() => {}}
        selectedKeyArea={null}
        onSelectKeyArea={() => {}}
        draftConfig={store.config}
        submittedConfig={store.request?.config ?? null}
        highlightPart={store.highlightPart}
        hoveredVariable={store.hoveredVariable}
        onHoverVariable={store.setHoveredVariable}
      />
    </>
  )
}

async function renderHarness() {
  render(
    <TooltipProvider>
      <ConfigStoreProvider metadata={FIXTURE_METADATA}>
        <Harness />
      </ConfigStoreProvider>
    </TooltipProvider>,
  )
  return screen.findByTestId('thermal-map-stub')
}

async function changeHousingToOpen() {
  fireEvent.click(screen.getByLabelText('Carcaça da eletrônica'))
  fireEvent.click(await screen.findByRole('option', { name: 'Open' }))
}

describe('ThermalMapSlot + ConfigPanel (Fase 1c, etapa C)', () => {
  it('propaga o rascunho da configuração para o mapa sem precisar de "Prever"', async () => {
    const stub = await renderHarness()
    expect(JSON.parse(stub.getAttribute('data-config') ?? '{}')).toMatchObject({ housing: 'Closed' })

    await changeHousingToOpen()

    expect(JSON.parse(stub.getAttribute('data-config') ?? '{}')).toMatchObject({ housing: 'Open' })
  })

  it('pulsa a peça mapeada da variável alterada e limpa depois de ~1,1 s', async () => {
    const stub = await renderHarness()

    await changeHousingToOpen()
    await wait(50)
    expect(stub.getAttribute('data-highlight')).toBe('housing-lid')

    await wait(1300)
    expect(stub.getAttribute('data-highlight')).toBe('')
  }, 10000)

  it('mostra o aviso de pré-visualização quando o rascunho diverge da última predição e some após "Prever"', async () => {
    await renderHarness()
    // A carga inicial já auto-submete a config de referência: nada divergente ainda.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await changeHousingToOpen()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Pré-visualização da configuração — clique em Prever para atualizar as temperaturas',
    )

    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('alterar "losses" não pulsa nenhuma peça e não gera erro no aviso de pré-visualização', async () => {
    const stub = await renderHarness()

    fireEvent.click(screen.getByLabelText('Perfil de perdas'))
    fireEvent.click(await screen.findByRole('option', { name: 'Losses A' }))
    await wait(1150)

    expect(stub.getAttribute('data-highlight')).toBe('')
    expect(screen.getByRole('status')).toBeInTheDocument()
  }, 10000)

  it('passar o mouse num chip da legenda destaca a peça correspondente', async () => {
    const stub = await renderHarness()
    const chip = screen.getByRole('button', { name: 'Carcaça da eletrônica' })

    fireEvent.mouseEnter(chip)
    expect(stub.getAttribute('data-highlight')).toBe('housing-lid')

    fireEvent.mouseLeave(chip)
    expect(stub.getAttribute('data-highlight')).toBe('')
  })
})
