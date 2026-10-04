import { fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { StoveConfigPanel } from '@/features/config/StoveConfigPanel'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { HistoryPanel } from '@/features/history/HistoryPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

let reopened = 0

function pickMode(name: string) {
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Operating mode' })).getByRole('radio', { name }),
  )
}

/** Faz o papel da tela de início: abre a consulta já com o nome (ou sem salvar, com `null`). */
function StartSession({ name }: { name: string | null }) {
  const { startSession } = useConfigStore()
  useEffect(() => startSession(name), [])
  return null
}

function renderHistory(name: string | null = 'Consulta 1') {
  reopened = 0
  return render(
    <TooltipProvider delayDuration={0}>
      <ConfigStoreProvider metadata={FIXTURE_METADATA}>
        <StartSession name={name} />
        <StoveConfigPanel />
        <HistoryPanel onReopen={() => (reopened += 1)} />
        <RequestSnapshot />
        <RecordPrediction />
        <DirectControls />
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

/**
 * Depois da 1ª previsão o `StoveConfigPanel` trava em resumo (não edita mais
 * pela sidebar). Alguns testes aqui cobrem a lógica do store ao longo de
 * VÁRIAS previsões da mesma consulta — isso é feito direto pelo store, sem
 * depender do formulário continuar visível na tela.
 */
function DirectControls() {
  const { setField, submit, hasDuplicateHistory } = useConfigStore()
  return (
    <>
      <button type="button" onClick={() => setField('run_case', 'Broil C2')}>
        Definir Broil C2
      </button>
      <button type="button" onClick={() => setField('run_case', 'Pyro')}>
        Definir Pyro
      </button>
      <button type="button" onClick={submit} disabled={hasDuplicateHistory}>
        {hasDuplicateHistory ? 'Previsão já salva no histórico' : 'Prever (direto)'}
      </button>
    </>
  )
}

describe('HistoryPanel', () => {
  it('salva a consulta ao prever e a reabre com a configuração original', () => {
    renderHistory()
    pickMode('Broil C2')
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))

    const historyName = screen.getByRole('button', { name: 'Abrir detalhes de Consulta 1' })
    expect(historyName).toBeInTheDocument()
    expect(document.querySelector('time')?.dateTime).not.toBe('')

    fireEvent.click(historyName)
    expect(screen.getByText('Configuração do fogão')).toBeInTheDocument()
    // A previsão roda em todas as áreas: o histórico lista todas.
    expect(screen.getAllByText('Botões do cooktop')).toHaveLength(1)
    expect(screen.queryByText('IGBT 1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reabrir consulta' }))
    expect(reopened).toBe(1)

    expect(screen.getByText('Operating mode')).toBeInTheDocument()
    expect(screen.getByTestId('prediction-request')).toHaveTextContent('"run_case":"Broil C2"')
  })

  it('só exclui uma consulta depois da confirmação por checkbox', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes de Consulta 1' }))

    const deleteButton = screen.getByRole('button', { name: 'Excluir consulta' })
    expect(deleteButton).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que desejo apagar/ }))
    expect(deleteButton).toBeEnabled()
    fireEvent.click(deleteButton)

    expect(
      screen.queryByRole('button', { name: 'Abrir detalhes de Consulta 1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/As consultas registradas aparecerão aqui/)).toBeInTheDocument()
  })

  it('permite renomear uma consulta depois de abrir seus detalhes', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))

    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes de Consulta 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Renomear Consulta 1' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome da consulta' }), {
      target: { value: 'Teste de ventilação' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByText('Teste de ventilação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Minimizar informações' })).toBeInTheDocument()
  })

  it('não mostra hash/identificador da consulta, só o nome dado', () => {
    renderHistory('Teste de ventilação')
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado' }))

    expect(screen.getByText('Teste de ventilação')).toBeInTheDocument()
    expect(screen.queryByText(/req-/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Registro/)).not.toBeInTheDocument()
  })

  it('cada previsão atualiza a mesma consulta em vez de criar outra', () => {
    renderHistory('Minha consulta')
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))
    fireEvent.click(screen.getByRole('button', { name: 'Definir Broil C2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prever (direto)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Definir Pyro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prever (direto)' }))

    expect(screen.getAllByRole('button', { name: /Abrir detalhes de/ })).toHaveLength(1)
    // Guarda a última: o histórico reabre com a configuração da última previsão.
    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes de Minha consulta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir consulta' }))
    expect(screen.getByTestId('prediction-request')).toHaveTextContent('"run_case":"Pyro"')
  })

  it('só visualização: nada é salvo no histórico', () => {
    renderHistory(null)
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))
    fireEvent.click(screen.getByRole('button', { name: 'Definir Broil C2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prever (direto)' }))

    expect(screen.queryByRole('button', { name: /Abrir detalhes de/ })).not.toBeInTheDocument()
    expect(screen.getByText(/As consultas registradas aparecerão aqui/)).toBeInTheDocument()
  })

  it('apagar a consulta em andamento faz a próxima previsão registrá-la de novo, com o mesmo nome', () => {
    renderHistory('Minha consulta')
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir detalhes de Minha consulta' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que desejo apagar/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir consulta' }))
    expect(screen.queryByRole('button', { name: /Abrir detalhes de/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Definir Broil C2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prever (direto)' }))
    expect(screen.getByRole('button', { name: 'Abrir detalhes de Minha consulta' })).toBeInTheDocument()
  })

  it('não permite prever novamente uma consulta idêntica já salva', () => {
    renderHistory()
    fireEvent.click(screen.getByRole('button', { name: 'Prever' }))

    const predictButton = screen.getByRole('button', {
      name: 'Previsão já salva no histórico',
    })
    expect(predictButton).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /Abrir detalhes de Consulta/ })).toHaveLength(1)
  })
})
