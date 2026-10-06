/**
 * Análise técnica: comparação com a referência, variáveis alteradas e
 * sensibilidade sob demanda. A fonte de dados é substituída por stubs.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PredictionRequest, PredictionResponse, StoveConfig } from '@/contract/v1'
import type { BaseOption } from './AnalysisPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'
import { renderWithQuery } from '@/test/queryWrapper'

const predict = vi.fn()
const getMetrics = vi.fn()
vi.mock('@/sources', () => ({
  getPredictionSource: () => ({ predict, getMetrics }),
}))

const { AnalysisPanel } = await import('./AnalysisPanel')

const REFERENCE = FIXTURE_METADATA.reference_config as StoveConfig
const CONFIG: StoveConfig = { ...REFERENCE, housing: 'Open', run_case: 'Broil C2' }
const REQUEST: PredictionRequest = { architecture: 'BR', config: CONFIG }

/** A base responde 10 °C abaixo da consulta atual em todos os sensores. */
const BASE_RESPONSE: PredictionResponse = {
  ...FIXTURE_RESPONSE,
  predictions: FIXTURE_RESPONSE.predictions.map((p) => ({ ...p, temp_c: p.temp_c - 10 })),
}

const BASE_OPTIONS: BaseOption[] = [
  { id: 1, name: 'Consulta de referência', createdAt: '2026-09-10T12:00:00.000Z', request: { architecture: 'BR', config: REFERENCE } },
  // Mesma configuração da consulta atual: não compara nada, então não pode ser oferecida.
  { id: 2, name: 'Cópia da atual', createdAt: '2026-09-10T12:01:00.000Z', request: REQUEST },
]

function renderPanel(props: Partial<React.ComponentProps<typeof AnalysisPanel>> = {}) {
  return renderWithQuery(
    <AnalysisPanel
      metadata={FIXTURE_METADATA}
      request={REQUEST}
      response={FIXTURE_RESPONSE}
      baseOptions={BASE_OPTIONS}
      keyArea="IPC Comp"
      keyAreaLabel="Compartimento da eletrônica de potência"
      {...props}
    />,
  )
}

function chooseBase(name: string) {
  const select = screen.getByRole('combobox', { name: /Comparar com/ })
  const option = within(select).getByRole('option', { name }) as HTMLOptionElement
  fireEvent.change(select, { target: { value: option.value } })
}

beforeEach(() => {
  predict.mockReset()
  getMetrics.mockReset()
  getMetrics.mockResolvedValue({
    model_version: 'models-1.0.0',
    generated_at: '2026-09-10T12:00:00.000Z',
    areas: [
      {
        key_area: 'IPC Comp',
        feature_importance: { housing: 0.5, run_case: 0.3 },
      },
    ],
  })
})

describe('AnalysisPanel', () => {
  it('não há base padrão: nada é comparado até o usuário escolher uma consulta', () => {
    renderPanel()
    expect(screen.queryByRole('list', { name: 'Δ médio por área' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(predict).not.toHaveBeenCalled()
  })

  it('mostra uma única seção "Comparar com uma base", sem chaves repetidas, mesmo após escolher a base', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    predict.mockResolvedValue(BASE_RESPONSE)
    renderPanel()
    expect(screen.getAllByRole('heading', { name: 'Comparar com uma base' })).toHaveLength(1)
    chooseBase('Consulta de referência')
    await screen.findByRole('list', { name: 'Δ médio por área' })
    expect(screen.getAllByRole('heading', { name: 'Comparar com uma base' })).toHaveLength(1)
    expect(screen.getAllByRole('combobox', { name: /Comparar com/ })).toHaveLength(1)
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/same key/)
    errors.mockRestore()
  })

  it('só oferece como base consultas com configuração diferente da atual', () => {
    renderPanel()
    const select = screen.getByRole('combobox', { name: /Comparar com/ })
    expect(within(select).getByRole('option', { name: 'Consulta de referência' })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'Cópia da atual' })).not.toBeInTheDocument()
  })

  it('sem outra consulta no Histórico, mostra a mensagem curta', () => {
    renderPanel({ baseOptions: [] })
    expect(screen.queryByRole('combobox', { name: /Comparar com/ })).not.toBeInTheDocument()
    expect(screen.getByText('Sem um histórico de testes.')).toBeInTheDocument()
    expect(screen.queryByText(/Escolha uma consulta do Histórico/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Efeito das variáveis na previsão/)).not.toBeInTheDocument()
  })

  it('ao escolher a base, prevê a configuração dela com o mesmo recorte e mostra o Δ por área e por sensor', async () => {
    predict.mockResolvedValue(BASE_RESPONSE)
    renderPanel({ request: { ...REQUEST, targets: { key_areas: ['IPC Comp', 'CT Knobs', 'Main Vent Sys'] } } })
    chooseBase('Consulta de referência')

    const byArea = await screen.findByRole('list', { name: 'Δ médio por área' })
    expect(predict).toHaveBeenCalledTimes(1)
    expect(predict.mock.calls[0][0]).toMatchObject({
      architecture: 'BR',
      config: REFERENCE,
      targets: { key_areas: ['IPC Comp', 'CT Knobs', 'Main Vent Sys'] },
    })
    expect(within(byArea).getAllByRole('listitem')).toHaveLength(3)
    expect(within(byArea).getAllByText(/médio [+]10,0 °C/)).toHaveLength(3)

    const table = screen.getByRole('table', { name: /Δ por sensor em Compartimento/ })
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(2)
    expect(within(table).getAllByText('+10,0 °C')).toHaveLength(2)
  })

  it('lista as variáveis alteradas em relação à base, com o peso no modelo da área', async () => {
    predict.mockResolvedValue(BASE_RESPONSE)
    renderPanel()
    chooseBase('Consulta de referência')
    expect(await screen.findByText('50 %', { selector: 'span.font-semibold' })).toBeInTheDocument()
    expect(screen.getByText('30 %', { selector: 'span.font-semibold' })).toBeInTheDocument()
    expect(getMetrics).toHaveBeenCalledWith(['IPC Comp'])
  })

  it('avisa quando a previsão da base falha', async () => {
    predict.mockRejectedValue(new Error('falhou'))
    renderPanel()
    chooseBase('Consulta de referência')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível calcular a previsão da base/)
  })

  it('não dispara nenhuma previsão de sensibilidade até o usuário pedir', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Calcular sensibilidade' })).toBeInTheDocument()
    expect(predict).not.toHaveBeenCalled()
  })

  it('ao pedir, prevê cada alternativa só na área analisada e ordena pelo maior efeito', async () => {
    // Âncora = IGBT 1 (104,5 °C). Trocar housing esfria 12 °C; qualquer outra, +1 °C.
    predict.mockImplementation(async (req: PredictionRequest) => {
      const cooler = req.config.housing === 'Closed'
      return {
        ...FIXTURE_RESPONSE,
        predictions: FIXTURE_RESPONSE.predictions
          .filter((p) => p.key_area === 'IPC Comp')
          .map((p) => ({
            ...p,
            temp_c: p.temp_c + (cooler ? -12 : 1),
            reliability: req.config.run_case === 'Pyro' ? ('moderate_extrapolation' as const) : p.reliability,
          })),
      }
    })

    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Calcular sensibilidade' }))

    const list = await screen.findByRole('list', { name: 'Sensibilidade por troca de variável' })
    // 7 variáveis × 1 alternativa cada.
    expect(predict).toHaveBeenCalledTimes(7)
    for (const [req] of predict.mock.calls as [PredictionRequest][]) {
      expect(req.targets).toEqual({ key_areas: ['IPC Comp'] })
    }

    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(7)
    expect(items[0]).toHaveTextContent('Electronics housing')
    expect(items[0]).toHaveTextContent('−12,0 °C')
    expect(items[0]).toHaveTextContent('maior efeito em')
    // Troca que leva a uma combinação não ensaiada é sinalizada.
    expect(within(list).getAllByText('extrapolação moderada').length).toBeGreaterThan(0)

    // Medir em um sensor específico só reorganiza o que já foi calculado: nenhuma previsão nova.
    fireEvent.change(screen.getByRole('combobox', { name: /Medir o efeito em/ }), { target: { value: '1' } })
    expect(predict).toHaveBeenCalledTimes(7)
    expect(within(list).queryByText(/maior efeito em/)).not.toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('−12,0 °C')
  })

  it('efeito que arredonda para zero aparece como "0,0 °C", sem sinal, e todas as linhas usam o mesmo grid', async () => {
    predict.mockImplementation(async () => ({
      ...FIXTURE_RESPONSE,
      predictions: FIXTURE_RESPONSE.predictions
        .filter((p) => p.key_area === 'IPC Comp')
        .map((p) => ({ ...p, temp_c: p.temp_c - 0.02 })),
    }))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Calcular sensibilidade' }))
    const list = await screen.findByRole('list', { name: 'Sensibilidade por troca de variável' })
    const items = within(list).getAllByRole('listitem')
    for (const item of items) {
      expect(item).toHaveTextContent('0,0 °C')
      expect(item).not.toHaveTextContent(/[−+]0,0/)
    }
    // Mesma definição de colunas em todas as linhas: é o que mantém as barras alinhadas.
    expect(new Set(items.map((i) => i.className.match(/grid-cols-\[[^\]]+\]/)?.[0])).size).toBe(1)
  })

  it('avisa quando alguma previsão da sensibilidade falha', async () => {
    predict.mockRejectedValue(new Error('falhou'))
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Calcular sensibilidade' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/falharam/))
  })
})
