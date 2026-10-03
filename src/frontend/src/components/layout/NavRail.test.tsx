import { fireEvent, render, screen } from '@testing-library/react'
import { ChartColumn, LayoutDashboard } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { NavRail } from '@/components/layout/NavRail'
import { TooltipProvider } from '@/components/ui/tooltip'

const ITEMS = [
  { id: 'a', label: 'Resultados', icon: LayoutDashboard },
  { id: 'b', label: 'Métricas Estatísticas', icon: ChartColumn },
] as const

function renderRail(active: 'a' | 'b' = 'a', onChange = vi.fn(), onHelp?: () => void) {
  render(
    <TooltipProvider>
      <NavRail items={[...ITEMS]} active={active} onChange={onChange} onHelp={onHelp} />
    </TooltipProvider>,
  )
  return onChange
}

describe('NavRail', () => {
  it('só ícones: cada item tem rótulo acessível e o ativo é marcado', () => {
    renderRail('b')
    expect(screen.getByRole('button', { name: 'Resultados' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Métricas Estatísticas' })).toHaveAttribute('aria-current', 'page')
    // Nenhum texto visível além dos ícones (o "TP" do logotipo é decorativo).
    expect(screen.queryByText('Resultados')).not.toBeInTheDocument()
  })

  it('clicar num ícone troca a seção', () => {
    const onChange = renderRail()
    fireEvent.click(screen.getByRole('button', { name: 'Métricas Estatísticas' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('tem o botão de Ajuda no canto inferior, ainda sem ação configurada', () => {
    renderRail()
    const help = screen.getByRole('button', { name: 'Ajuda' })
    expect(() => fireEvent.click(help)).not.toThrow()
  })

  it('chama onHelp quando configurado', () => {
    const onHelp = vi.fn()
    renderRail('a', vi.fn(), onHelp)
    fireEvent.click(screen.getByRole('button', { name: 'Ajuda' }))
    expect(onHelp).toHaveBeenCalledTimes(1)
  })
})
