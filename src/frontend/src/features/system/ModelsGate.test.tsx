import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithQuery } from '@/test/queryWrapper'
import { enableMockMode, fetchModelStatus, generateModels, type ModelStatus } from '@/features/system/api'
import { ModelsGate } from '@/features/system/ModelsGate'

vi.mock('@/features/system/api', () => ({
  fetchModelStatus: vi.fn(),
  enableMockMode: vi.fn(),
  generateModels: vi.fn(),
}))

const QUESTION = 'Sem dataset. Deseja utilizar comando de dados mockados?'
const HAVE_CSVS = 'Tenho os CSVs'
const NO_CSVS = 'Não tenho os CSVs e vou anexar os arquivos'
const USE_MOCK = 'Sim, usar os dados mockados'

function status(state: ModelStatus['state'], message = ''): ModelStatus {
  return { state, message }
}

describe('ModelsGate', () => {
  beforeEach(() => {
    vi.mocked(fetchModelStatus).mockReset()
    vi.mocked(enableMockMode).mockReset()
    vi.mocked(generateModels).mockReset()
  })

  it('sem dataset, oferece as três saídas', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    renderWithQuery(<ModelsGate />)

    expect(await screen.findByRole('dialog', { name: QUESTION })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: HAVE_CSVS })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: NO_CSVS })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: USE_MOCK })).toBeInTheDocument()
  })

  it.each(['pending', 'failed'] as const)(
    'com o estado %s (CSVs presentes) também abre a primeira tela, sem motivo técnico',
    async (state) => {
      vi.mocked(fetchModelStatus).mockResolvedValue(status(state, 'Não foi possível gerar os modelos: falta pandas.'))
      renderWithQuery(<ModelsGate />)

      const dialog = await screen.findByRole('dialog', { name: QUESTION })
      expect(dialog).not.toHaveTextContent('pandas')
      expect(generateModels).not.toHaveBeenCalled()
    },
  )

  it('"Tenho os CSVs" sem os arquivos avisa que a pessoa não os tem, e dá para voltar', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: HAVE_CSVS }))

    expect(await screen.findByRole('dialog', { name: 'Ops, percebi que você não tem!' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('dialog', { name: QUESTION })).toBeInTheDocument()
  })

  it('"Tenho os CSVs" com os arquivos oferece Gerar os modelos, Entrar e Voltar', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('pending'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: HAVE_CSVS }))

    expect(await screen.findByRole('dialog', { name: 'Encontrei os seus CSVs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar os modelos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('dialog', { name: QUESTION })).toBeInTheDocument()
  })

  it('Gerar os modelos só roda quando a pessoa clica, e mostra o aviso de geração', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('pending'))
    vi.mocked(generateModels).mockResolvedValue(status('training'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: HAVE_CSVS }))
    expect(generateModels).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar os modelos' }))

    await waitFor(() => expect(generateModels).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('status')).toHaveTextContent('de 5 a 10 minutos')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Entrar sem modelos mostra "Ops, você ainda não tem modelos", com Voltar', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('pending'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: HAVE_CSVS }))
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('dialog', { name: 'Ops, você ainda não tem modelos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('dialog', { name: 'Encontrei os seus CSVs' })).toBeInTheDocument()
  })

  it('Entrar com os modelos já gerados fecha o aviso', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValueOnce(status('pending'))
    vi.mocked(fetchModelStatus).mockResolvedValueOnce(status('pending'))
    vi.mocked(fetchModelStatus).mockResolvedValue(status('ready'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: HAVE_CSVS }))
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('"Não tenho os CSVs" mostra o passo a passo, só com Voltar', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: NO_CSVS }))

    const dialog = screen.getByRole('dialog', { name: 'Como anexar o arquivo CSV bruto' })
    expect(dialog).toHaveTextContent('dataset_bruto.csv')
    expect(dialog).toHaveTextContent('mainback_data.csv')
    expect(dialog).toHaveTextContent('de 5 a 10 minutos')
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument()
    expect(enableMockMode).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('dialog', { name: QUESTION })).toBeInTheDocument()
  })

  it('"Sim, usar os dados mockados" passa a API para o mock e fecha o aviso', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('no_dataset'))
    vi.mocked(enableMockMode).mockResolvedValue(status('mock'))
    renderWithQuery(<ModelsGate />)

    fireEvent.click(await screen.findByRole('button', { name: USE_MOCK }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(enableMockMode).toHaveBeenCalledTimes(1)
  })

  it('com dataset, avisa que os modelos estão sendo gerados', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('training'))
    renderWithQuery(<ModelsGate />)

    expect(await screen.findByRole('status')).toHaveTextContent('Gerando os modelos')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('remontar o aviso (sair e entrar de novo) volta à primeira tela', async () => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status('pending'))
    const first = renderWithQuery(<ModelsGate />)
    fireEvent.click(await screen.findByRole('button', { name: HAVE_CSVS }))
    await screen.findByRole('dialog', { name: 'Encontrei os seus CSVs' })
    first.unmount()

    renderWithQuery(<ModelsGate />)

    expect(await screen.findByRole('dialog', { name: QUESTION })).toBeInTheDocument()
  })

  it.each(['ready', 'mock'] as const)('com o estado %s não mostra nada', async (state) => {
    vi.mocked(fetchModelStatus).mockResolvedValue(status(state))
    const { container } = renderWithQuery(<ModelsGate />)

    await waitFor(() => expect(fetchModelStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
