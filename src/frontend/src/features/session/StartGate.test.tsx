import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StartGate } from '@/features/session/StartGate'

function renderGate() {
  const onStart = vi.fn()
  render(<StartGate onStart={onStart} />)
  return onStart
}

const begin = () => screen.getByRole('button', { name: 'Começar' })

describe('StartGate', () => {
  it('pergunta se quer registrar e só libera "Começar" depois de responder', () => {
    renderGate()
    expect(screen.getByText('Deseja registrar esta previsão?')).toBeInTheDocument()
    expect(begin()).toBeDisabled()
    expect(screen.queryByLabelText('Qual o nome da consulta?')).not.toBeInTheDocument()
  })

  it('"Sim" pede o nome, exige que não seja vazio e entrega o nome sem espaços nas pontas', () => {
    const onStart = renderGate()
    fireEvent.click(screen.getByRole('radio', { name: /Sim, registrar/ }))
    expect(begin()).toBeDisabled()

    const input = screen.getByLabelText('Qual o nome da consulta?')
    fireEvent.change(input, { target: { value: '   ' } })
    expect(begin()).toBeDisabled()

    fireEvent.change(input, { target: { value: '  Teste do Mainback  ' } })
    expect(begin()).toBeEnabled()
    fireEvent.click(begin())
    expect(onStart).toHaveBeenCalledWith('Teste do Mainback')
  })

  it('"Não" entra sem pedir nome e entrega null (só visualização)', () => {
    const onStart = renderGate()
    fireEvent.click(screen.getByRole('radio', { name: /Não, só visualizar/ }))
    expect(screen.queryByLabelText('Qual o nome da consulta?')).not.toBeInTheDocument()
    fireEvent.click(begin())
    expect(onStart).toHaveBeenCalledWith(null)
  })

  it('Enter no campo de nome também começa', () => {
    const onStart = renderGate()
    fireEvent.click(screen.getByRole('radio', { name: /Sim, registrar/ }))
    fireEvent.change(screen.getByLabelText('Qual o nome da consulta?'), { target: { value: 'Rápido' } })
    fireEvent.submit(screen.getByLabelText('Qual o nome da consulta?').closest('form') as HTMLFormElement)
    expect(onStart).toHaveBeenCalledWith('Rápido')
  })
})
