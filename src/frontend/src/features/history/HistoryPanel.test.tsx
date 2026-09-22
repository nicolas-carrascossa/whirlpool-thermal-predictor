import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfigPanel } from '@/features/config/ConfigPanel'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { HistoryPanel } from '@/features/history/HistoryPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

function renderHistory() {
  return render(
    <TooltipProvider delayDuration={0}>
      <ConfigStoreProvider metadata={FIXTURE_METADATA}>
        <ConfigPanel />
        <HistoryPanel />
        <RequestSnapshot />
        <RecordPrediction />
      </ConfigStoreProvider>
    </TooltipProvider>,
  )
}

function RequestSnapshot() {
  const { request } = useConfigStore()
  return <output data-testid="prediction-request">{JSON.stringify(request)}</output>
}

function RecordPrediction() {
  const { request, recordHistoryPrediction } = useConfigStore()
  return (
    <button
      type="button"
      onClick={() => request && recordHistoryPrediction(request, FIXTURE_RESPONSE)}
    >
      Registrar resultado
    </button>
  )
}

describe('HistoryPanel', () => {
  it('salva a consulta ao prever e a reabre com seu recorte original', () => {
    renderHistory()
    fireEvent.click(screen.getByLabelText('Modo de operação'))
    fireEvent.click(screen.getByRole('option', { name: 'Broil C2' }))
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Compartimento da eletrônica de potência/ }),
    )
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))

    const historyName = screen.getByRole('button', { name: 'Abrir detalhes de Consulta 1' })
    expect(historyName).toBeInTheDocument()
    expect(screen.getByText('Registro aguardando resultado')).toBeInTheDocument()
    expect(document.querySelector('time')?.dateTime).not.toBe('')

    fireEvent.click(historyName)
    expect(screen.getByText('Configuração do fogão')).toBeInTheDocument()
    expect(screen.getAllByText('Botões do cooktop')).toHaveLength(3)
    expect(screen.queryByText('IGBT 1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Modo de operação'))
    fireEvent.click(screen.getByRole('option', { name: 'Pyro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar todas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir consulta' }))

    expect(screen.getByLabelText('Modo de operação')).toHaveTextContent('Broil C2')
    expect(
      screen.getByRole('checkbox', { name: /Compartimento da eletrônica de potência/ }),
    ).not.toBeChecked()
    const request = JSON.parse(screen.getByTestId('prediction-request').textContent ?? 'null')
    expect(request.targets).toEqual({ key_areas: ['CT Knobs', 'Main Vent Sys'] })
  })

  it('só exclui uma consulta depois da confirmação por checkbox', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes de Consulta 1' }))

    const deleteButton = screen.getByRole('button', { name: 'Excluir consulta' })
    expect(deleteButton).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que desejo apagar/ }))
    expect(deleteButton).toBeEnabled()
    fireEvent.click(deleteButton)

    expect(
      screen.queryByRole('button', { name: 'Abrir detalhes de Consulta 1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/As consultas aparecerão aqui/)).toBeInTheDocument()
  })

  it('permite renomear uma consulta depois de abrir seus detalhes', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes de Consulta 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Renomear Consulta 1' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome da consulta' }), {
      target: { value: 'Teste de ventilação' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByText('Teste de ventilação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Minimizar informações' })).toBeInTheDocument()
  })

  it('exibe no histórico o mesmo request_id devolvido pela previsão', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado' }))

    expect(screen.getByText('Registro req-0000test')).toBeInTheDocument()
  })

  it('não permite prever novamente uma consulta idêntica já salva', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: /^Prever/ }))

    const predictButton = screen.getByRole('button', {
      name: 'Previsão já salva no histórico',
    })
    expect(predictButton).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /Abrir detalhes de Consulta/ })).toHaveLength(1)
  })
})
