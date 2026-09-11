import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { StyleguidePage } from './Styleguide'

describe('StyleguidePage', () => {
  it('renderiza o título e a seção de cores', () => {
    render(
      <MemoryRouter>
        <StyleguidePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Guia de estilo')).toBeInTheDocument()
    expect(screen.getByText('Cores')).toBeInTheDocument()
    expect(screen.getAllByText('Dentro do limite').length).toBeGreaterThan(0)
  })
})
