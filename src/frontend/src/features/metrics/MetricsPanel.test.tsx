/**
 * Aba "Métricas Estatísticas": o seletor de área troca os dados exibidos, a
 * tabela tem uma linha por área e a ressalva de dados simulados está visível.
 *
 * Os gráficos do recharts são substituídos por stubs que expõem os dados
 * recebidos — em jsdom eles renderizam com dimensão 0, então o que se testa é
 * a camada de dados e os rótulos acessíveis, não a geometria do SVG.
 */

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FIXTURE_METADATA } from '@/test/fixtures'

import { MetricsPanel } from './MetricsPanel'
import { METRICS_DISCLAIMER, MOCK_AREA_METRICS, metricsForArea } from './mockMetrics'

vi.mock('./PredictedVsActualScatter', () => ({
  default: ({ points }: { points: unknown[] }) => (
    <div data-testid="scatter-stub" data-count={points.length} />
  ),
}))
vi.mock('./FeatureImportanceBars', () => ({
  default: ({ importance }: { importance: Record<string, number> }) => (
    <div data-testid="importance-stub" data-importance={JSON.stringify(importance)} />
  ),
}))
vi.mock('./AreaMaeBars', () => ({
  default: ({ selectedKeyArea }: { selectedKeyArea: string }) => (
    <div data-testid="mae-stub" data-selected={selectedKeyArea} />
  ),
}))

/** Metadata com as 7 áreas reais (a fixture padrão só tem 3). */
const METADATA = {
  ...FIXTURE_METADATA,
  key_areas: MOCK_AREA_METRICS.map((m) => ({
    name: m.keyArea,
    label_pt: `Área ${m.keyArea}`,
    n_sensors: m.predictedVsActual.length,
  })),
}

describe('MetricsPanel', () => {
  it('deixa explícito que os dados são simulados', () => {
    render(<MetricsPanel metadata={METADATA} />)
    expect(screen.getByRole('note')).toHaveTextContent(METRICS_DISCLAIMER)
  })

  it('renderiza uma linha da tabela de erro por área, com o status frente ao KPI', () => {
    render(<MetricsPanel metadata={METADATA} />)
    const rows = screen.getAllByRole('row').filter((r) => r.hasAttribute('data-key-area'))
    expect(rows).toHaveLength(MOCK_AREA_METRICS.length)
    const coil = rows.find((r) => r.getAttribute('data-key-area') === 'Coil Temps') as HTMLElement
    expect(coil).toHaveAttribute('data-kpi-status', 'danger')
    expect(within(coil).getByText('Fora do KPI')).toBeInTheDocument()
    expect(within(coil).getByText('Área Coil Temps')).toBeInTheDocument()
  })

  it('o seletor de área troca os dados dos gráficos', async () => {
    render(<MetricsPanel metadata={METADATA} />)
    const first = MOCK_AREA_METRICS[0]
    expect(screen.getByLabelText('Área do modelo')).toHaveTextContent(`Área ${first.keyArea}`)
    expect(await screen.findByTestId('scatter-stub')).toHaveAttribute(
      'data-count',
      String(first.predictedVsActual.length),
    )

    fireEvent.click(screen.getByLabelText('Área do modelo'))
    fireEvent.click(await screen.findByRole('option', { name: 'Área Oven HMI' }))

    const oven = metricsForArea('Oven HMI')!
    expect(screen.getByTestId('scatter-stub')).toHaveAttribute('data-count', String(oven.predictedVsActual.length))
    expect(JSON.parse(screen.getByTestId('importance-stub').getAttribute('data-importance') ?? '{}')).toEqual(
      oven.featureImportance,
    )
    expect(screen.getByTestId('mae-stub')).toHaveAttribute('data-selected', 'Oven HMI')
    expect(screen.getByText(/Previsto vs\. real — Área Oven HMI/)).toBeInTheDocument()
  })

  it('o mapa de calor mostra o valor em cada célula e sincroniza a seleção de área', () => {
    render(<MetricsPanel metadata={METADATA} />)
    const heatmap = screen.getByRole('table', { name: /Mapa de calor do erro/ })
    const cells = within(heatmap).getAllByRole('cell')
    // 7 áreas × 5 estatísticas, todas com número em pt-BR e unidade.
    expect(cells).toHaveLength(MOCK_AREA_METRICS.length * 5)
    for (const cell of cells) expect(cell.textContent).toMatch(/^\d+,\d °C$/)

    fireEvent.click(within(heatmap).getByRole('button', { name: 'Área CT Knobs' }))
    expect(within(heatmap).getByRole('button', { name: 'Área CT Knobs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mae-stub')).toHaveAttribute('data-selected', 'CT Knobs')
  })
})
