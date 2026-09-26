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
    expect(screen.getByText('Todas as áreas')).toBeInTheDocument()
    // Com todas já marcadas, "Selecionar todas" não tem o que fazer.
    expect(screen.getByRole('button', { name: 'Selecionar todas' })).toBeDisabled()
  })

  it('ordena as seções por áreas, sensores selecionados e configurações', () => {
    renderPanel()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Áreas',
      'Sensores das áreas selecionadas',
      'Configurações do fogão',
    ])
  })

  it('desmarcar uma área remove só ela da lista explícita e mantém as demais marcadas', () => {
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
    // Recorte parcial: "Selecionar todas" volta a ficar disponível e restaura o estado "todas".
    const selectAll = screen.getByRole('button', { name: 'Selecionar todas' })
    expect(selectAll).toBeEnabled()
    fireEvent.click(selectAll)
    expect(ipc).toBeChecked()
    expect(screen.getByText('Todas as áreas')).toBeInTheDocument()
  })

  it('desmarcar todas as áreas deixa zero selecionadas e desabilita "Prever"', () => {
    renderPanel()
    const initialRequest = screen.getByTestId('prediction-request').textContent
    for (const area of FIXTURE_METADATA.key_areas) {
      fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(area.label_pt) }))
    }
    for (const area of FIXTURE_METADATA.key_areas) {
      expect(screen.getByRole('checkbox', { name: new RegExp(area.label_pt) })).not.toBeChecked()
    }
    expect(screen.getByText('Nenhuma área selecionada')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma área selecionada.')).toBeInTheDocument()

    const predict = screen.getByRole('button', { name: /^Prever/ })
    expect(predict).toBeDisabled()
    expect(screen.getByText('Selecione ao menos uma área para prever.')).toBeInTheDocument()

    // Sem área não há requisição representável: submeter não muda nada.
    fireEvent.submit(predict.closest('form') as HTMLFormElement)
    expect(screen.getByTestId('prediction-request').textContent).toBe(initialRequest)
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

    expect(screen.getByText('Todas as áreas')).toBeInTheDocument()
    const request = JSON.parse(screen.getByTestId('prediction-request').textContent ?? 'null')
    expect(request.config.run_case).toBe('Broil C2')
    // Todas as áreas selecionadas = sem recorte: `key_areas` não é enviado.
    expect(request.targets).toBeUndefined()
  })

  it('só envia key_areas em recorte parcial; voltar a marcar todas omite targets', () => {
    renderPanel()
    const ipc = screen.getByRole('checkbox', { name: /Compartimento da eletrônica de potência/ })
    fireEvent.click(ipc)
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    let request = JSON.parse(screen.getByTestId('prediction-request').textContent ?? 'null')
    expect(request.targets).toEqual({ key_areas: ['CT Knobs', 'Main Vent Sys'] })

    fireEvent.click(ipc)
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    request = JSON.parse(screen.getByTestId('prediction-request').textContent ?? 'null')
    expect(request.targets).toBeUndefined()
  })

  it('"Selecionar todos os sensores" marca os sensores listados (áreas selecionadas + busca)', () => {
    renderPanel()
    const selectAllSensors = screen.getByRole('button', { name: 'Selecionar todos os sensores' })

    // Com o filtro de busca, só o que está visível na lista é marcado.
    fireEvent.change(screen.getByLabelText('Buscar sensor pelo nome'), { target: { value: 'igbt' } })
    fireEvent.click(selectAllSensors)
    fireEvent.change(screen.getByLabelText('Buscar sensor pelo nome'), { target: { value: '' } })
    expect(screen.getByRole('checkbox', { name: /IGBT 1/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /CMC 1/ })).not.toBeChecked()
    expect(screen.getByText('1 sensor(es) escolhido(s)')).toBeInTheDocument()

    // Sem filtro, marca todos os sensores das áreas selecionadas.
    fireEvent.click(selectAllSensors)
    for (const s of FIXTURE_METADATA.sensors) {
      expect(screen.getByRole('checkbox', { name: new RegExp(s.tc_name) })).toBeChecked()
    }
    expect(screen.getByText('4 sensor(es) escolhido(s)')).toBeInTheDocument()

    // Sem sensor listado (nenhuma área), o botão não tem o que marcar.
    for (const area of FIXTURE_METADATA.key_areas) {
      fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(area.label_pt) }))
    }
    expect(selectAllSensors).toBeDisabled()
  })

  it('as seções recolhem e expandem pelo cabeçalho, mantendo os headings', () => {
    renderPanel()
    const toggle = screen.getByRole('button', { name: 'Áreas' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const contentId = toggle.getAttribute('aria-controls')
    expect(contentId).toBeTruthy()
    expect(document.getElementById(contentId as string)).toBeVisible()

    // Desmarca uma área antes de recolher, para a ação "Selecionar todas" ter efeito.
    const ipc = screen.getByRole('checkbox', { name: /Compartimento da eletrônica de potência/ })
    fireEvent.click(ipc)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(contentId as string)).not.toBeVisible()
    expect(screen.queryByRole('checkbox', { name: /Botões do cooktop/ })).not.toBeInTheDocument()
    // O heading nível 2 continua lá com o mesmo texto.
    expect(screen.getByRole('heading', { level: 2, name: 'Áreas' })).toBeInTheDocument()
    // A ação ao lado do gatilho segue clicável e não alterna a seção.
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar todas' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox', { name: /Botões do cooktop/ })).toBeInTheDocument()
    expect(ipc).toBeChecked()

    // As outras duas seções também são disclosures.
    for (const title of ['Sensores das áreas selecionadas', 'Configurações do fogão']) {
      const button = screen.getByRole('button', { name: title })
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    }
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
