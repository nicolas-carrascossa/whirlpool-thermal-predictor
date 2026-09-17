import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfigPanel } from '@/features/config/ConfigPanel'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { FIXTURE_METADATA } from '@/test/fixtures'

function renderPanel() {
  return render(
    <TooltipProvider delayDuration={0}>
      <ConfigStoreProvider metadata={FIXTURE_METADATA}>
        <ConfigPanel />
        <RequestSnapshot />
      </ConfigStoreProvider>
    </TooltipProvider>,
  )
}

function RequestSnapshot() {
  const { request } = useConfigStore()
  return <output data-testid="prediction-request">{JSON.stringify(request)}</output>
}

describe('ConfigPanel', () => {
  it('gera um select por variável do metadata, na ordem recebida', () => {
    renderPanel()
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(FIXTURE_METADATA.variables.length)
    expect(selects.map((s) => s.getAttribute('aria-label'))).toEqual(
      FIXTURE_METADATA.variables.map((v) => v.label_pt),
    )
  })

  it('já abre preenchido com a configuração de referência', () => {
    renderPanel()
    expect(screen.getByLabelText('Modo de operação')).toHaveTextContent('Pyro')
    expect(screen.getByLabelText('Carcaça da eletrônica')).toHaveTextContent('Closed')
  })

  it('marca as variáveis fora do modelo e oferece ajuda em cada variável', () => {
    renderPanel()
    expect(screen.getAllByText('informativo — não usado pelo modelo')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /^Ajuda sobre / })).toHaveLength(
      FIXTURE_METADATA.variables.length,
    )
  })

  it('lista as áreas com a contagem de sensores e todas marcadas por padrão', () => {
    renderPanel()
    for (const area of FIXTURE_METADATA.key_areas) {
      const checkbox = screen.getByRole('checkbox', { name: new RegExp(area.label_pt) })
      expect(checkbox).toBeChecked()
    }
    expect(screen.getByText('Todas as áreas (padrão)')).toBeInTheDocument()
  })

  it('ordena as seções por áreas, sensores selecionados e configurações', () => {
    renderPanel()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Áreas',
      'Sensores das áreas selecionadas',
      'Configurações do fogão',
    ])
  })

  it('desmarcar uma área no estado "todas" mantém as demais marcadas', () => {
    renderPanel()
    const ipc = screen.getByRole('checkbox', {
      name: /Compartimento da eletrônica de potência/,
    })
    fireEvent.click(ipc)
    expect(ipc).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Botões do cooktop/ })).toBeChecked()
    expect(screen.getByText('2 de 3 áreas')).toBeInTheDocument()
    expect(screen.queryByText('IGBT 1')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Botões do cooktop' }),
    ).toBeInTheDocument()
  })

  it('mostra as ações da consulta', async () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /^Prever/ })).toBeInTheDocument()
    const runAll = screen.getByRole('button', { name: 'Run All' })
    expect(runAll).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Limpar seleção' })).toBeInTheDocument()

    fireEvent.pointerMove(runAll, { pointerType: 'mouse' })
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Roda todas as áreas do fogão com a configuração selecionada.',
    )
  })

  it('Run All submete a configuração atual para todas as áreas', () => {
    renderPanel()
    const mode = screen.getByLabelText('Modo de operação')
    fireEvent.click(mode)
    fireEvent.click(screen.getByRole('option', { name: 'Broil C2' }))
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Compartimento da eletrônica de potência/ }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Run All' }))

    expect(screen.getByText('Todas as áreas (padrão)')).toBeInTheDocument()
    const request = JSON.parse(screen.getByTestId('prediction-request').textContent ?? 'null')
    expect(request.config.run_case).toBe('Broil C2')
    expect(request.targets).toBeUndefined()
  })

  it('submete somente os sensores marcados, mesmo com áreas selecionadas', () => {
    renderPanel()
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Ventilação principal/ }),
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /IGBT 1/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))

    const request = JSON.parse(screen.getByTestId('prediction-request').textContent ?? 'null')
    expect(request.targets).toEqual({ sensors: [1] })
  })
})
