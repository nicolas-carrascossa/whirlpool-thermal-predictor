import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { UserCard } from '@/components/layout/UserCard'

describe('UserCard', () => {
  it('mostra nome, função e as iniciais no avatar', () => {
    const { container } = render(<UserCard name="João Silva" role="Engenharia Térmica" />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Engenharia Térmica')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('JS')
  })

  it('nome de uma palavra usa uma inicial só', () => {
    const { container } = render(<UserCard name="João" role="x" />)
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('J')
  })

  it('só oferece "Sair" quando há sessão', () => {
    const { rerender } = render(<UserCard name="João" role="x" />)
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
    const onLogout = vi.fn()
    rerender(<UserCard name="João" role="x" onLogout={onLogout} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
