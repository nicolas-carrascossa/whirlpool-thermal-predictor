import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ContractError } from '@/contract/v1'
import { ResultsPanel, groupByArea } from '@/features/results/ResultsPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE, FIXTURE_RESPONSE_MX } from '@/test/fixtures'
import { renderWithQuery } from '@/test/queryWrapper'

function renderPanel(props: Partial<React.ComponentProps<typeof ResultsPanel>> = {}) {
  return renderWithQuery(
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
  it('abre com a seção de resultados e deixa o mapa térmico numa seção própria', () => {
    const { container } = renderPanel()
    expect(screen.getByText('Sensores previstos')).toBeInTheDocument()
    // As seções inativas ficam desmontadas: nem o mapa 3D nem as métricas pagam custo escondidos.
    expect(container.querySelector('[data-slot="thermal-map"]')).not.toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    // A troca de seção é da barra lateral: não há mais abas aqui.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('monta as métricas estatísticas na seção "metricas"', async () => {
    renderPanel({ activeTab: 'metricas' })
    expect(screen.queryByText('Sensores previstos')).not.toBeInTheDocument()
    // As métricas vêm do `PredictionSource` (v1.1): a seção carrega de forma assíncrona.
    expect(await screen.findByLabelText('Área do modelo')).toBeInTheDocument()
  })

  it('não mostra métricas antes de haver uma previsão', () => {
    renderPanel({ activeTab: 'metricas', response: undefined, hasRequest: false })
    expect(screen.getByText('Esperando previsão')).toBeInTheDocument()
    expect(screen.queryByLabelText('Área do modelo')).not.toBeInTheDocument()
  })

  it('monta o mapa térmico na seção "mapa"', () => {
    const { container } = renderPanel({ activeTab: 'mapa' })
    expect(container.querySelector('[data-slot="thermal-map"]')).toBeInTheDocument()
    expect(screen.queryByText('Sensores previstos')).not.toBeInTheDocument()
  })

  it('volta para os resultados quando o pai troca a seção', () => {
    const { container, rerender } = renderPanel({ activeTab: 'mapa' })
    expect(container.querySelector('[data-slot="thermal-map"]')).toBeInTheDocument()
    rerender(
      <ResultsPanel
        metadata={FIXTURE_METADATA}
        response={FIXTURE_RESPONSE}
        isLoading={false}
        error={null}
        hasRequest
        activeTab="resultados"
      />,
    )
    expect(screen.getByText('Sensores previstos')).toBeInTheDocument()
  })

  it('resume a consulta com as contagens', () => {
    renderPanel()
    const valueOf = (label: string) => screen.getByText(label).parentElement?.nextSibling
    expect(valueOf('Sensores previstos')).toHaveTextContent('4')
    expect(valueOf('Excedem o limite')).toHaveTextContent('1')
  })

  it('mostra cada indicador num cartão próprio e sem o rodapé de procedência', () => {
    renderPanel()
    const labels = ['Sensores previstos', 'Excedem o limite', 'Em atenção (≥ 90 %)']
    const cards = labels.map((label) => screen.getByText(label).closest('div.relative') as HTMLElement)
    expect(new Set(cards).size).toBe(3)
    // O card de pior razão temp/limite saiu.
    expect(screen.queryByText('Pior razão temp/limite')).not.toBeInTheDocument()
    expect(screen.queryByText(/IGBT 1 ·/)).not.toBeInTheDocument()
    expect(screen.queryByText('mock-0.1.0')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Consulta req-/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Gerado em/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Direção do blower:/)).not.toBeInTheDocument()
  })

  it('não mostra o algoritmo no cabeçalho do card de área', () => {
    renderPanel()
    expect(screen.queryByText('Random Forest')).not.toBeInTheDocument()
    expect(screen.queryByText('Gradient Boosting')).not.toBeInTheDocument()
  })

  it('mostra o histórico quando a seção ativa é "historico" e há conteúdo', () => {
    renderPanel({ activeTab: 'historico', historySlot: <p>conteúdo do histórico</p> })
    expect(screen.getByText('conteúdo do histórico')).toBeInTheDocument()
    expect(screen.queryByText('Sensores previstos')).not.toBeInTheDocument()
  })

  it('mostra a aprovação apenas para a visão não técnica', () => {
    const { unmount } = renderPanel()
    expect(screen.queryByText(/Confiabilidade:/)).not.toBeInTheDocument()
    unmount()

    const extrapolated = {
      ...FIXTURE_RESPONSE,
      predictions: FIXTURE_RESPONSE.predictions.map((p) => ({ ...p, reliability: 'moderate_extrapolation' as const })),
    }
    renderPanel({ response: extrapolated, technicianView: false })
    expect(screen.getByText('Aprovação')).toBeInTheDocument()
    expect(screen.getByText('Média')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a tabela não tem mais as colunas Razão e Confiável, nem o círculo de pior razão', () => {
    const { container } = renderPanel()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Sensor', 'Temperatura', 'Margem de erro', 'Limite', 'Status'])
    expect(container.querySelector('[data-reliable]')).not.toBeInTheDocument()
    expect(screen.queryByText(/pior razão/i)).not.toBeInTheDocument()
    // O gráfico de barras fica sozinho no topo do detalhe.
    expect(container.querySelector('tbody tr[data-tc]')).toBeInTheDocument()
  })

  it('o cabeçalho da área diz "Atenção nestes sensores" com a contagem, em vez de máx. e status', () => {
    renderPanel()
    // IPC Comp: 1 acima do limite + 1 em atenção.
    expect(screen.getByText('Atenção nestes sensores')).toBeInTheDocument()
    expect(screen.getByLabelText('2 sensores')).toHaveTextContent('2')
    expect(screen.queryByText(/^máx\./)).not.toBeInTheDocument()
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
    const { container } = renderPanel({ selectedKeyArea: 'Main Vent Sys', onSelectKeyArea: () => {} })
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
      screen.getByText('Selecione uma configuração ao lado e clique em Prever para ver os resultados aqui.'),
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

  it('mostra uma área por vez: abre a mais crítica e troca pela faixa de áreas', () => {
    renderPanel()
    // Sem escolha, abre a de maior razão (IPC Comp) e mais nenhuma.
    expect(screen.getByRole('heading', { level: 3, name: 'Compartimento da eletrônica de potência' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Botões do cooktop' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver resultados: Compartimento da eletrônica de potência' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados: Botões do cooktop' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Botões do cooktop' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Compartimento da eletrônica de potência' })).not.toBeInTheDocument()
  })

  it('não há dropdown: o detalhe da área já vem aberto, com a tabela de sensores', () => {
    const { container } = renderPanel()
    expect(container.querySelectorAll('tbody tr[data-tc]').length).toBeGreaterThan(0)
    expect(container.querySelector('[aria-expanded]')).not.toBeInTheDocument()
  })

  it('respeita a área escolhida de fora e avisa a troca, sem limpar ao reclicar na atual', () => {
    const picked: string[] = []
    renderPanel({ selectedKeyArea: 'CT Knobs', onSelectKeyArea: (a) => a && picked.push(a) })
    expect(screen.getByRole('heading', { level: 3, name: 'Botões do cooktop' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados: Botões do cooktop' }))
    expect(picked).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados: Ventilação principal' }))
    expect(picked).toEqual(['Main Vent Sys'])
  })

  it('a faixa mostra status e pior razão por área; área só de monitoramento não inventa número', () => {
    renderPanel()
    const ipc = screen.getByRole('button', { name: 'Ver resultados: Compartimento da eletrônica de potência' })
    expect(within(ipc).getByText('Excede o limite')).toBeInTheDocument()
    // 1 dos 2 sensores com limite excede: 50 % dentro do limite.
    expect(within(ipc).getByText('50 %')).toBeInTheDocument()
    expect(within(ipc).getByText('dentro do limite')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: 'Ver resultados: Ventilação principal' })).getByText('monitor')).toBeInTheDocument()
    // Área com todos os sensores dentro do limite: 100 %.
    expect(within(screen.getByRole('button', { name: 'Ver resultados: Botões do cooktop' })).getByText('100 %')).toBeInTheDocument()
  })

})
