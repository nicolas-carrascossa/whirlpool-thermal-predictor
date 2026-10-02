import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { StoveConfigPanel } from '@/features/config/StoveConfigPanel'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { VARIABLE_LABEL_EN } from '@/features/config/variableLabels'
import type { Metadata, StoveConfig } from '@/contract/v1'
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
      FIXTURE_METADATA.variables.map((v) => VARIABLE_LABEL_EN[v.name as keyof StoveConfig]),
    )
    // Sem dropdown: todas as opções ficam visíveis de uma vez.
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    for (const variable of FIXTURE_METADATA.variables) {
      const radios = within(group(VARIABLE_LABEL_EN[variable.name as keyof StoveConfig])).getAllByRole('radio')
      expect(radios.map((r) => r.textContent)).toEqual(variable.options)
    }
  })

  it('já abre preenchido com a configuração de referência', () => {
    renderPanel()
    expect(within(group('Operating mode')).getByRole('radio', { name: 'Pyro' })).toBeChecked()
    expect(within(group('Electronics housing')).getByRole('radio', { name: 'Closed' })).toBeChecked()
    expect(within(group('Electronics housing')).getByRole('radio', { name: 'Open' })).not.toBeChecked()
  })

  it('clicar numa opção troca o valor da variável', () => {
    renderPanel()
    fireEvent.click(within(group('Operating mode')).getByRole('radio', { name: 'Broil C2' }))
    expect(snapshot().config.run_case).toBe('Broil C2')
    expect(within(group('Operating mode')).getByRole('radio', { name: 'Broil C2' })).toBeChecked()
  })

  it('as setas do teclado movem a seleção dentro do grupo', () => {
    renderPanel()
    const pyro = within(group('Operating mode')).getByRole('radio', { name: 'Pyro' })
    fireEvent.keyDown(pyro, { key: 'ArrowRight' })
    expect(snapshot().config.run_case).toBe('Broil C2')
    fireEvent.keyDown(within(group('Operating mode')).getByRole('radio', { name: 'Broil C2' }), {
      key: 'ArrowLeft',
    })
    expect(snapshot().config.run_case).toBe('Pyro')
  })

  it('só a opção marcada entra na ordem de tabulação', () => {
    renderPanel()
    const radios = within(group('Operating mode')).getAllByRole('radio')
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1])
  })

  it('marca as variáveis fora do modelo e oferece ajuda em cada variável', () => {
    renderPanel()
    expect(screen.getAllByText('informative — not used by the model')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /^Ajuda sobre / })).toHaveLength(
      FIXTURE_METADATA.variables.length,
    )
  })

  it('sinaliza o que mudou em relação à configuração de referência', () => {
    renderPanel()
    expect(screen.queryByRole('img', { name: /Diferente da referência/ })).not.toBeInTheDocument()
    fireEvent.click(within(group('Operating mode')).getByRole('radio', { name: 'Broil C2' }))
    expect(screen.getByRole('img', { name: 'Diferente da referência (Pyro)' })).toBeInTheDocument()
    fireEvent.click(within(group('Operating mode')).getByRole('radio', { name: 'Pyro' }))
    expect(screen.queryByRole('img', { name: /Diferente da referência/ })).not.toBeInTheDocument()
  })

  it('passar o mouse na variável destaca a variável no mapa 3D', () => {
    renderPanel()
    const card = group('Operating mode').closest('div[class*="border-b"]') as HTMLElement
    fireEvent.mouseEnter(card)
    expect(snapshot().hoveredVariable).toBe('run_case')
    fireEvent.mouseLeave(card)
    expect(snapshot().hoveredVariable).toBeNull()
  })

  it('variável com muitas opções volta a ser um dropdown, em vez de um paredão de botões', () => {
    const options = Array.from({ length: 9 }, (_, i) => `Perfil ${i + 1}`)
    const many: Metadata = {
      ...FIXTURE_METADATA,
      variables: FIXTURE_METADATA.variables.map((v) => (v.name === 'losses' ? { ...v, options } : v)),
      reference_config: { ...FIXTURE_METADATA.reference_config, losses: 'Perfil 1' },
    }
    renderPanel(many)
    expect(screen.queryByRole('radiogroup', { name: 'Losses' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Losses' })).toHaveTextContent('Perfil 1')
    // As demais variáveis continuam com as opções visíveis.
    expect(screen.getAllByRole('radiogroup')).toHaveLength(FIXTURE_METADATA.variables.length - 1)
  })

  it('não tem ícone de variável nem texto em português nos rótulos', () => {
    const { container } = renderPanel()
    expect(screen.getByRole('heading', { level: 2, name: 'Stove configuration' })).toBeInTheDocument()
    expect(screen.getByText('Blower direction')).toBeInTheDocument()
    expect(screen.getByText('Coil support material')).toBeInTheDocument()
    // Só o ícone de ajuda (ⓘ) sobra em cada cartão; a bandeira é a única imagem.
    expect(container.querySelectorAll('svg:not([role="img"])')).toHaveLength(FIXTURE_METADATA.variables.length)
    expect(screen.getByRole('img', { name: 'Brasil' })).toBeInTheDocument()
  })

  it('esconde as opções que o processamento unifica (Open - Updated, Aluminium Plate) e as de losses não treinadas', () => {
    const meta: Metadata = {
      ...FIXTURE_METADATA,
      variables: FIXTURE_METADATA.variables.map((v) =>
        v.name === 'housing'
          ? { ...v, options: ['Closed', 'Open', 'Open - Updated'] }
          : v.name === 'material_coil_support'
            ? { ...v, options: ['Aluminium', 'Aluminium Plate', 'Plastic'] }
            : v.name === 'losses'
              ? { ...v, options: ['No losses', 'Simone Losses', 'Miro', 'Miro - Front Order'] }
              : v,
      ),
    }
    renderPanel(meta)
    const optionsOf = (label: string) =>
      within(group(label)).getAllByRole('radio').map((r) => r.textContent)
    expect(optionsOf('Electronics housing')).toEqual(['Closed', 'Open'])
    expect(optionsOf('Coil support material')).toEqual(['Aluminium', 'Plastic'])
    expect(optionsOf('Losses')).toEqual(['No losses', 'Miro - Front Order'])
  })

  it('losses fica em botões (um por linha, nomes longos), não em dropdown', () => {
    const meta: Metadata = {
      ...FIXTURE_METADATA,
      variables: FIXTURE_METADATA.variables.map((v) =>
        v.name === 'losses'
          ? { ...v, options: ['No losses', 'Broil C2 Simone - Front Order', 'Miro Qualitative  - Back Order'] }
          : v,
      ),
    }
    renderPanel(meta)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(group('Losses').className).toMatch(/grid-cols-1/)
    // O espaço duplo do dataset não aparece na tela, mas o valor enviado continua o original.
    fireEvent.click(within(group('Losses')).getByRole('radio', { name: 'Miro Qualitative - Back Order' }))
    expect(snapshot().config.losses).toBe('Miro Qualitative  - Back Order')
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
