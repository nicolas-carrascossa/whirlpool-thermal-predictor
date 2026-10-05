import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithQuery } from '@/test/queryWrapper'
import { enableMockMode, fetchModelStatus, type ModelStatus } from '@/features/system/api'
import { ModelsGate } from '@/features/system/ModelsGate'

vi.mock('@/features/system/api', () => ({
  fetchModelStatus: vi.fn(),
  enableMockMode: vi.fn(),
}))

const QUESTION = 'Sem dataset. Deseja utilizar comando de dados mockados?'

function status(state: ModelStatus['state'], message = ''): ModelStatus {
  return { state, message }
}

describe('ModelsGate', () => {
  beforeEach(() => {
    vi.mocked(fetchModelStatus).mockReset()
    vi.mocked(enableMockMode).mockReset()
  })

  it('sem dataset, pergunta se quer usar os dados mockados, com Sim e Não', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    renderWithQuery(<ModelsGate />)

    expect(await screen.findByRole('dialog', { name: QUESTION })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sim' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Não' })).toBeInTheDocument()
  })

  it('Não fecha o aviso sem chamar a API', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: 'Não' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(enableMockMode).not.toHaveBeenCalled()
  })

  it('Sim passa a API para os dados mockados e fecha o aviso', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    vi.mocked(enableMockMode).mockResolvedValue(status('mock'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(enableMockMode).toHaveBeenCalledTimes(1)
  })

  it('com dataset, avisa que os modelos estão sendo gerados', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('training'))
    renderWithQuery(<ModelsGate />)

    expect(await screen.findByRole('status')).toHaveTextContent('Gerando os modelos')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('quando a geração falha, mostra o motivo e também oferece os dados mockados', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(
      status('failed', 'Não foi possível gerar os modelos: falta pandas no Python da API.'),
    )
    vi.mocked(enableMockMode).mockResolvedValue(status('mock'))
    renderWithQuery(<ModelsGate />)

    const dialog = await screen.findByRole('dialog', {
      name: 'Não foi possível gerar os modelos. Deseja utilizar comando de dados mockados?',
    })
    expect(dialog).toHaveTextContent('falta pandas no Python da API.')

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(enableMockMode).toHaveBeenCalledTimes(1)
  })

  it.each(['ready', 'mock'] as const)('com o estado %s não mostra nada', async (state) => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status(state))
    const { container } = renderWithQuery(<ModelsGate />)

    await waitFor(() => expect(fetchModelStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
