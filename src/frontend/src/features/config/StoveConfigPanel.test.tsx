import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { StoveConfigPanel } from '@/features/config/StoveConfigPanel'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import type { Metadata } from '@/contract/v1'
import { FIXTURE_METADATA } from '@/test/fixtures'

function renderPanel(metadata: Metadata = FIXTURE_METADATA) {
  return render(
    <TooltipProvider delayDuration={0}>
      <ConfigStoreProvider metadata={metadata}>
        <StoveConfigPanel />
        <Snapshot />
      </ConfigStoreProvider>
    </TooltipProvider>,
  )
}

function Snapshot() {
  const { config, hoveredVariable } = useConfigStore()
  return <output data-testid="snapshot">{JSON.stringify({ config, hoveredVariable })}</output>
}

function snapshot() {
  return JSON.parse(screen.getByTestId('snapshot').textContent ?? 'null')
}

function group(label: string) {
  return screen.getByRole('radiogroup', { name: label })
}

describe('StoveConfigPanel', () => {
  it('gera um grupo de opções por variável do metadata, na ordem recebida', () => {
    renderPanel()
    const groups = screen.getAllByRole('radiogroup')
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(
      FIXTURE_METADATA.variables.map((v) => v.label_pt),
    )
    // Sem dropdown: todas as opções ficam visíveis de uma vez.
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    for (const variable of FIXTURE_METADATA.variables) {
      const radios = within(group(variable.label_pt)).getAllByRole('radio')
      expect(radios.map((r) => r.textContent)).toEqual(variable.options)
    }
  })

  it('já abre preenchido com a configuração de referência', () => {
    renderPanel()
    expect(within(group('Modo de operação')).getByRole('radio', { name: 'Pyro' })).toBeChecked()
    expect(within(group('Carcaça da eletrônica')).getByRole('radio', { name: 'Closed' })).toBeChecked()
    expect(within(group('Carcaça da eletrônica')).getByRole('radio', { name: 'Open' })).not.toBeChecked()
  })

  it('clicar numa opção troca o valor da variável', () => {
    renderPanel()
    fireEvent.click(within(group('Modo de operação')).getByRole('radio', { name: 'Broil C2' }))
    expect(snapshot().config.run_case).toBe('Broil C2')
    expect(within(group('Modo de operação')).getByRole('radio', { name: 'Broil C2' })).toBeChecked()
  })

  it('as setas do teclado movem a seleção dentro do grupo', () => {
    renderPanel()
    const pyro = within(group('Modo de operação')).getByRole('radio', { name: 'Pyro' })
    fireEvent.keyDown(pyro, { key: 'ArrowRight' })
    expect(snapshot().config.run_case).toBe('Broil C2')
    fireEvent.keyDown(within(group('Modo de operação')).getByRole('radio', { name: 'Broil C2' }), {
      key: 'ArrowLeft',
    })
    expect(snapshot().config.run_case).toBe('Pyro')
  })

  it('só a opção marcada entra na ordem de tabulação', () => {
    renderPanel()
    const radios = within(group('Modo de operação')).getAllByRole('radio')
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1])
  })

  it('marca as variáveis fora do modelo e oferece ajuda em cada variável', () => {
    renderPanel()
    expect(screen.getAllByText('informativo — não usado pelo modelo')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /^Ajuda sobre / })).toHaveLength(
      FIXTURE_METADATA.variables.length,
    )
  })

  it('sinaliza o que mudou em relação à configuração de referência', () => {
    renderPanel()
    expect(screen.queryByRole('img', { name: /Diferente da referência/ })).not.toBeInTheDocument()
    fireEvent.click(within(group('Modo de operação')).getByRole('radio', { name: 'Broil C2' }))
    expect(screen.getByRole('img', { name: 'Diferente da referência (Pyro)' })).toBeInTheDocument()
    fireEvent.click(within(group('Modo de operação')).getByRole('radio', { name: 'Pyro' }))
    expect(screen.queryByRole('img', { name: /Diferente da referência/ })).not.toBeInTheDocument()
  })

  it('passar o mouse no cartão destaca a variável no mapa 3D', () => {
    renderPanel()
    const card = group('Modo de operação').closest('div[class*="rounded-lg"]') as HTMLElement
    fireEvent.mouseEnter(card)
    expect(snapshot().hoveredVariable).toBe('run_case')
    fireEvent.mouseLeave(card)
    expect(snapshot().hoveredVariable).toBeNull()
  })

  it('variável com muitas opções volta a ser um dropdown, em vez de um paredão de botões', () => {
    const options = Array.from({ length: 8 }, (_, i) => `Perfil ${i + 1}`)
    const many: Metadata = {
      ...FIXTURE_METADATA,
      variables: FIXTURE_METADATA.variables.map((v) => (v.name === 'losses' ? { ...v, options } : v)),
      reference_config: { ...FIXTURE_METADATA.reference_config, losses: 'Perfil 1' },
    }
    renderPanel(many)
    expect(screen.queryByRole('radiogroup', { name: 'Perfil de perdas' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Perfil de perdas' })).toHaveTextContent('Perfil 1')
    // As demais variáveis continuam com as opções visíveis.
    expect(screen.getAllByRole('radiogroup')).toHaveLength(FIXTURE_METADATA.variables.length - 1)
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
})
