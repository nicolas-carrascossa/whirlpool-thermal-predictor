/**
 * Testes de integração da Fase 1c, etapa C: o rascunho do formulário
 * (`ConfigPanel`) alimenta o `<ThermalMap3D>` (mockado — não renderiza WebGL)
 * em tempo real via `ThermalMapSlot`, sem precisar de "Prever".
 *
 * Usa temporizadores reais (em vez de fake timers) porque o pulso da peça
 * dura ~1,1 s de relógio real.
 */

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import type { ThermalMap3DProps } from '@/components/thermal-map/ThermalMap3D'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { StoveConfigPanel } from '@/features/config/StoveConfigPanel'
import { ThermalMapSlot } from '@/features/results/ThermalMapSlot'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

vi.mock('@/components/thermal-map/ThermalMap3D', () => ({
  ThermalMap3D: (props: ThermalMap3DProps) => (
    <div
      data-testid="thermal-map-stub"
      data-config={JSON.stringify(props.config)}
      data-highlight={props.highlightPart ?? ''}
      data-focus={JSON.stringify(props.focusRequest ?? null)}
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
      <StoveConfigPanel />
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
        focusRequest={store.focusRequest}
        submittedConfig={store.request?.config ?? null}
        highlightPart={store.highlightPart}
        hoveredVariable={store.hoveredVariable}
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

function pick(variable: string, option: string) {
  fireEvent.click(within(screen.getByRole('radiogroup', { name: variable })).getByRole('radio', { name: option }))
}

async function changeHousingToOpen() {
  pick('Electronics housing', 'Open')
}

describe('ThermalMapSlot + StoveConfigPanel (Fase 1c, etapa C)', () => {
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
    // Antes da 1ª previsão, qualquer rascunho já é "divergente" (nada foi submetido ainda).
    expect(screen.getByRole('status')).toBeInTheDocument()

    await changeHousingToOpen()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Pré-visualização da configuração — clique em Prever para atualizar as temperaturas',
    )

    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('alterar "losses" não pulsa nenhuma peça e não gera erro no aviso de pré-visualização', async () => {
    const stub = await renderHarness()

    pick('Losses', 'Losses A')
    await wait(1150)

    expect(stub.getAttribute('data-highlight')).toBe('')
    expect(screen.getByRole('status')).toBeInTheDocument()
  }, 10000)

  it('em "Configuração selecionada", passar o mouse numa variável destaca a peça e clicar leva o mapa até ela', async () => {
    const stub = await renderHarness()
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    const row = screen.getByRole('button', { name: /Electronics housing: Closed/ })

    fireEvent.mouseEnter(row)
    expect(stub.getAttribute('data-highlight')).toBe('housing-lid')
    fireEvent.mouseLeave(row)
    expect(stub.getAttribute('data-highlight')).toBe('')

    fireEvent.click(row)
    expect(JSON.parse(stub.getAttribute('data-focus') ?? 'null')).toMatchObject({ part: 'housing-lid', token: 1 })
    fireEvent.click(row)
    expect(JSON.parse(stub.getAttribute('data-focus') ?? 'null')).toMatchObject({ token: 2 })
  })

  it('"losses" não vira botão em "Configuração selecionada" (não tem peça no 3D)', async () => {
    await renderHarness()
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    expect(screen.queryByRole('button', { name: /^Losses:/ })).not.toBeInTheDocument()
  })
})
