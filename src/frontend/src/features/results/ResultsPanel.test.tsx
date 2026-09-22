import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ContractError } from '@/contract/v1'
import { ResultsPanel, groupByArea } from '@/features/results/ResultsPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE, FIXTURE_RESPONSE_MX } from '@/test/fixtures'

function renderPanel(props: Partial<React.ComponentProps<typeof ResultsPanel>> = {}) {
  return render(
    <ResultsPanel
      metadata={FIXTURE_METADATA}
      response={FIXTURE_RESPONSE}
      isLoading={false}
      error={null}
      hasRequest
      {...props}
    />,
  )
}

describe('groupByArea', () => {
  it('ordena as áreas pela maior razão temp/limite e joga as de monitoramento para o fim', () => {
    const groups = groupByArea(FIXTURE_RESPONSE, FIXTURE_METADATA)
    expect(groups.map((g) => g.name)).toEqual(['IPC Comp', 'CT Knobs', 'Main Vent Sys'])
    expect(groups[0].worstSensor?.tc_name).toBe('IGBT 1')
    expect(groups[0].singleLimit).toBe(90)
    expect(groups[2].maxRatio).toBeNull()
    expect(groups[2].worstSensor).toBeNull()
  })

  it('não define singleLimit quando os sensores da área têm limites diferentes', () => {
    const mixed = {
      ...FIXTURE_RESPONSE,
      predictions: FIXTURE_RESPONSE.predictions.map((p) =>
        p.tc_number === 2 ? { ...p, active_limit_c: 80 } : p,
      ),
    }
    const groups = groupByArea(mixed, FIXTURE_METADATA)
    const ipc = groups.find((g) => g.name === 'IPC Comp')
    expect(ipc?.singleLimit).toBeNull()
  })
})

describe('ResultsPanel', () => {
  it('abre com a aba de resultados e deixa o mapa térmico numa aba própria', () => {
    const { container } = renderPanel()
    expect(screen.getByRole('tab', { name: 'Resultados' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Mapa térmico' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Métricas Estatísticas' })).toHaveAttribute('aria-selected', 'false')
    // As abas inativas ficam desmontadas: nem o mapa 3D nem as métricas pagam custo escondidos.
    expect(container.querySelector('[data-slot="thermal-map"]')).not.toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(screen.getByText('Sensores previstos')).toBeInTheDocument()
  })

  it('monta as métricas estatísticas (simuladas) ao entrar na aba "Métricas Estatísticas"', () => {
    renderPanel()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Métricas Estatísticas' }))
    expect(screen.getByRole('tab', { name: 'Métricas Estatísticas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('note')).toHaveTextContent(/simulad/i)
    expect(screen.getByLabelText('Área do modelo')).toBeInTheDocument()
    expect(screen.queryByText('Sensores previstos')).not.toBeInTheDocument()
  })

  it('monta o mapa térmico ao entrar na aba "Mapa térmico"', () => {
    const { container } = renderPanel()
    // O Radix ativa a aba no mousedown (não no click).
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Mapa térmico' }))
    expect(container.querySelector('[data-slot="thermal-map"]')).toBeInTheDocument()
    expect(screen.queryByText('Sensores previstos')).not.toBeInTheDocument()
  })

  it('respeita a aba controlada de fora e avisa a troca', () => {
    let changed: string | undefined
    const { container } = renderPanel({ activeTab: 'mapa', onTabChange: (tab) => (changed = tab) })
    expect(container.querySelector('[data-slot="thermal-map"]')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resultados' }))
    expect(changed).toBe('resultados')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Métricas Estatísticas' }))
    expect(changed).toBe('metricas')
  })

  it('resume a consulta com as contagens e o pior sensor', () => {
    renderPanel()
    expect(screen.getByText('Sensores previstos').nextSibling).toHaveTextContent('4')
    expect(screen.getByText('Excedem o limite').nextSibling).toHaveTextContent('1')
    expect(screen.getByText(/IGBT 1 ·/)).toBeInTheDocument()
    expect(screen.getByText('mock-0.1.0')).toBeInTheDocument()
  })

  it('coloca o sensor que excede o limite no topo da sua área, com badge vermelho', () => {
    const { container } = renderPanel()
    const rows = container.querySelectorAll('tbody tr')
    const ipcRows = [...rows].filter((r) => ['1', '2'].includes(r.getAttribute('data-tc') ?? ''))
    expect(ipcRows[0].getAttribute('data-tc')).toBe('1')
    expect(ipcRows[0].getAttribute('data-status')).toBe('danger')
    expect(within(ipcRows[0] as HTMLElement).getByText('Excede o limite')).toBeInTheDocument()
    expect(within(ipcRows[1] as HTMLElement).getByText('Atenção')).toBeInTheDocument()
  })

  it('mostra "monitor" e badge neutro para sensores sem limite', () => {
    const { container } = renderPanel()
    const monitorRow = container.querySelector('tbody tr[data-tc="4"]') as HTMLElement
    expect(within(monitorRow).getByText('monitor')).toBeInTheDocument()
    expect(within(monitorRow).getAllByText('Monitor').length).toBeGreaterThan(0)
  })

  it('avisa que a arquitetura México não tem dados de treino', () => {
    renderPanel({ response: FIXTURE_RESPONSE_MX })
    expect(
      screen.getByText(/Sem dados de treino para a arquitetura México/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Sensores previstos')).not.toBeInTheDocument()
  })

  it('mostra o estado vazio antes da primeira consulta', () => {
    renderPanel({ response: undefined, hasRequest: false })
    expect(
      screen.getByText('Selecione uma configuração e clique em Prever.'),
    ).toBeInTheDocument()
  })

  it('mostra o esqueleto durante o carregamento', () => {
    renderPanel({ response: undefined, isLoading: true })
    expect(screen.getByLabelText('Carregando resultados')).toBeInTheDocument()
  })

  it('mostra a mensagem em pt-BR de um erro de contrato', () => {
    renderPanel({
      error: new ContractError('Valor inválido para "housing": "X".', 'housing', 'X'),
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Valor inválido para "housing": "X".')
  })

  it('filtra para uma única área quando selectedKeyArea está definido', () => {
    renderPanel({ selectedKeyArea: 'CT Knobs' })
    expect(screen.getByText(/Filtrando: Botões do cooktop/)).toBeInTheDocument()
    expect(screen.getByText('Botões do cooktop')).toBeInTheDocument()
    expect(screen.queryByText('Compartimento da eletrônica de potência')).not.toBeInTheDocument()
    expect(screen.queryByText('Ventilação principal')).not.toBeInTheDocument()
  })

  it('chama onSelectKeyArea(null) ao clicar no chip de filtro', () => {
    let cleared: string | null | undefined
    renderPanel({
      selectedKeyArea: 'CT Knobs',
      onSelectKeyArea: (area) => {
        cleared = area
      },
    })
    fireEvent.click(screen.getByText(/Filtrando: Botões do cooktop/))
    expect(cleared).toBeNull()
  })
})
