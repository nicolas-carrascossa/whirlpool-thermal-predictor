/**
 * Aba "Métricas Estatísticas" (v1.1): consome `GET /api/v1/metrics` através de
 * `PredictionSource`, escopada às áreas do recorte, e exibe a procedência do
 * modelo em cada linha.
 *
 * Os gráficos do recharts são substituídos por stubs que expõem os dados
 * recebidos — em jsdom eles renderizam com dimensão 0, então o que se testa é
 * a camada de dados e os rótulos acessíveis, não a geometria do SVG.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AlgorithmCode,
  AreaMetrics,
  MetricsResponse,
  PredictionResponse,
  ValidationPoint,
} from '@/contract/v1'
import { FIXTURE_METADATA } from '@/test/fixtures'
import { renderWithQuery } from '@/test/queryWrapper'

vi.mock('./PredictedVsActualScatter', () => ({
  default: ({ points, executedRun }: { points: unknown[]; executedRun: number | null }) => (
    <div data-testid="scatter-stub" data-count={points.length} data-executed={String(executedRun)} />
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
vi.mock('./ResidualScatter', () => ({
  default: ({ points, executedRun }: { points: unknown[]; executedRun: number | null }) => (
    <div data-testid="residual-stub" data-count={points.length} data-executed={String(executedRun)} />
  ),
}))

const getMetrics = vi.fn()
vi.mock('@/sources', () => ({
  getPredictionSource: () => ({ getMetrics }),
}))

const { MetricsPanel } = await import('./MetricsPanel')

const IMPORTANCE = {
  blower_direction: 0.2,
  housing: 0.3,
  board_position: 0,
  run_case: 0.4,
  losses: 0,
  deflector_hole: 0.05,
  material_coil_support: 0.05,
}

/** Dois ensaios × dois termopares, o mínimo para exercitar recorte e destaque. */
function points(base: number): ValidationPoint[] {
  return [0, 1].flatMap((run) =>
    [base, base + 1].map((tc) => ({
      target: `tc-${tc}`,
      run,
      tc_numbers: [tc],
      tc_name: `Sensor ${tc}`,
      active_limit_c: 120,
      actual_c: 90 + tc,
      predicted_c: 90 + tc + run,
    })),
  )
}

function area(key: string, algorithm: AlgorithmCode, mapePct: number, base = 1): AreaMetrics {
  return {
    key_area: key,
    algorithm,
    mae: 4.5,
    rmse: 6.1,
    r2: 0.42,
    mape_pct: mapePct,
    within_ten_pct_rate: 0.83,
    feature_importance: IMPORTANCE,
    validation: {
      runs: [{ label: 'Broil C2 · Closed · To Back' }, { label: 'Bake · Open · To Front' }],
      points: points(base),
    },
  }
}

const RESPONSE: MetricsResponse = {
  model_version: 'models-1.0.0',
  areas: [
    area('Mainback', 'random_forest', 4, 1),
    area('Coil Temps', 'gradient_boosting', 12, 11),
  ],
  generated_at: '2026-09-23T12:00:00.000Z',
}

const METADATA = {
  ...FIXTURE_METADATA,
  key_areas: [
    { name: 'Mainback', label_pt: 'Painel traseiro', n_sensors: 10 },
    { name: 'Coil Temps', label_pt: 'Resistências', n_sensors: 8 },
  ],
}

/** Resposta mínima: a aba só lê `tc_number` e `temp_c` das predições. */
function responseWith(predictions: { tc_number: number; temp_c: number }[]): PredictionResponse {
  return { predictions } as unknown as PredictionResponse
}

beforeEach(() => {
  getMetrics.mockReset()
  getMetrics.mockResolvedValue(RESPONSE)
})

describe('MetricsPanel', () => {
  it('pede ao back-end somente as áreas do recorte', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} keyAreas={['Mainback']} />)
    await waitFor(() => expect(getMetrics).toHaveBeenCalledWith(['Mainback']))
  })

  it('sem recorte, pede todas as áreas', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} keyAreas={[]} />)
    await waitFor(() => expect(getMetrics).toHaveBeenCalledWith(undefined))
  })

  it('mostra a versão do conjunto de modelos e uma linha por área', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    expect(await screen.findByText('models-1.0.0')).toBeInTheDocument()

    const rows = screen.getAllByRole('row').filter((r) => r.hasAttribute('data-key-area'))
    expect(rows).toHaveLength(2)
    const coil = rows.find((r) => r.getAttribute('data-key-area') === 'Coil Temps') as HTMLElement
    expect(coil).toHaveAttribute('data-kpi-status', 'danger')
    expect(within(coil).getByText('Fora do KPI')).toBeInTheDocument()
  })

  it('na visão não técnica oculta diagnósticos detalhados de erro', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} technicianView={false} />)
    expect(await screen.findByText('models-1.0.0')).toBeInTheDocument()

    expect(screen.queryByText(/Resíduo vs\. previsto/)).not.toBeInTheDocument()
    expect(screen.queryByText('Medidas de erro por área')).not.toBeInTheDocument()
    expect(screen.queryByTestId('residual-stub')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mae-stub')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('row').filter((r) => r.hasAttribute('data-key-area'))).toHaveLength(0)
  })

  it('na visão técnica mantém os diagnósticos detalhados de erro', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} technicianView />)
    expect(await screen.findByText(/Resíduo vs\. previsto/)).toBeInTheDocument()
    expect(screen.getByText('Medidas de erro por área')).toBeInTheDocument()
    expect(await screen.findByTestId('residual-stub')).toBeInTheDocument()
    expect(screen.getByTestId('mae-stub')).toBeInTheDocument()
  })

  it('identifica o algoritmo de cada área por rótulo textual', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    const rows = await screen.findAllByRole('row')
    const withArea = rows.filter((r) => r.hasAttribute('data-key-area'))
    const main = withArea.find((r) => r.getAttribute('data-key-area') === 'Mainback') as HTMLElement
    const coil = withArea.find((r) => r.getAttribute('data-key-area') === 'Coil Temps') as HTMLElement
    expect(main).toHaveAttribute('data-algorithm', 'random_forest')
    expect(within(main).getByText('Random Forest')).toBeInTheDocument()
    expect(coil).toHaveAttribute('data-algorithm', 'gradient_boosting')
    expect(within(coil).getByText('Gradient Boosting')).toBeInTheDocument()
  })

  it('o seletor de área troca a importância exibida', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    expect(await screen.findByLabelText('Área do modelo')).toHaveTextContent('Painel traseiro')
    expect(JSON.parse(screen.getByTestId('importance-stub').getAttribute('data-importance') ?? '{}')).toEqual(
      IMPORTANCE,
    )

    fireEvent.click(screen.getByLabelText('Área do modelo'))
    fireEvent.click(await screen.findByRole('option', { name: 'Resistências' }))
    expect(screen.getByTestId('mae-stub')).toHaveAttribute('data-selected', 'Coil Temps')
    expect(screen.getByText(/Previsto vs\. real — Resistências/)).toBeInTheDocument()
  })

  it('mostra as matrizes de decisão por leitura e por design', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    expect(await screen.findByText(/Decisão por leitura — Painel traseiro/)).toBeInTheDocument()
    expect(screen.getByText(/Decisão por design — Painel traseiro/)).toBeInTheDocument()
    expect(screen.getByText('Como ler as matrizes de decisão')).toBeInTheDocument()
    expect(screen.queryByText('Decisão por área')).not.toBeInTheDocument()
  })

  it('não exibe mais aviso de dado simulado: os quatro cartões são reais', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    await screen.findByTestId('scatter-stub')
    expect(screen.queryAllByRole('note')).toHaveLength(0)
    expect(document.body.textContent).not.toMatch(/simulad/i)
  })

  it('sem previsão executada, a dispersão mostra todos os pares da área', async () => {
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    // 2 ensaios x 2 termopares.
    expect(await screen.findByTestId('scatter-stub')).toHaveAttribute('data-count', '4')
    expect(screen.getByTestId('scatter-stub')).toHaveAttribute('data-executed', 'null')
  })

  it('recorta os pares aos termopares que a consulta devolveu', async () => {
    renderWithQuery(
      <MetricsPanel
        metadata={METADATA}
        response={responseWith([{ tc_number: 1, temp_c: 999 }])}
      />,
    )
    // Só o sensor 1, nos 2 ensaios — os pares do sensor 2 saem de cena.
    expect(await screen.findByTestId('scatter-stub')).toHaveAttribute('data-count', '2')
  })

  it('destaca o ensaio cuja configuração é a que foi consultada', async () => {
    // O ensaio 1 do Mainback prevê 92 para o tc 1 e 93 para o tc 2 (90+tc+run).
    renderWithQuery(
      <MetricsPanel
        metadata={METADATA}
        response={responseWith([
          { tc_number: 1, temp_c: 92 },
          { tc_number: 2, temp_c: 93 },
        ])}
      />,
    )
    expect(await screen.findByTestId('scatter-stub')).toHaveAttribute('data-executed', '1')
  })

  it('mostra o estado vazio quando o recorte não tem área', async () => {
    getMetrics.mockResolvedValue({ ...RESPONSE, areas: [] })
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    expect(await screen.findByText('Nenhuma área no recorte atual.')).toBeInTheDocument()
  })

  it('avisa quando as métricas não carregam', async () => {
    getMetrics.mockRejectedValue(new Error('modo mock não expõe métricas'))
    renderWithQuery(<MetricsPanel metadata={METADATA} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('modo mock não expõe métricas')
  })
})
