import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfigPanel } from '@/features/config/ConfigPanel'
import { ConfigStoreProvider } from '@/features/config/store'
import { FIXTURE_METADATA } from '@/test/fixtures'

function renderPanel() {
  return render(
    <TooltipProvider>
      <ConfigStoreProvider metadata={FIXTURE_METADATA}>
        <ConfigPanel />
      </ConfigStoreProvider>
    </TooltipProvider>,
  )
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

  it('desmarcar uma área no estado "todas" mantém as demais marcadas', () => {
    renderPanel()
    const ipc = screen.getByRole('checkbox', {
      name: /Compartimento da eletrônica de potência/,
    })
    fireEvent.click(ipc)
    expect(ipc).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Botões do cooktop/ })).toBeChecked()
    expect(screen.getByText('2 de 3 áreas')).toBeInTheDocument()
  })

  it('mostra as ações da consulta', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /^Prever/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configuração de referência' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Limpar seleção' })).toBeInTheDocument()
  })
})
