/**
 * Barra lateral esquerda, preta, só com ícones: navegação entre as seções da
 * tela (substitui as abas de cima) e o atalho de ajuda no canto inferior.
 *
 * Sem texto visível, então cada ícone tem rótulo acessível (`aria-label`) e
 * tooltip. O item ativo é marcado com `aria-current="page"`.
 */

import type { LucideIcon } from 'lucide-react'
import { CircleHelp } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface NavItem<Id extends string = string> {
  id: Id
  label: string
  icon: LucideIcon
}

function RailButton({
  label,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={onClick}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            active ? 'text-white' : 'text-white/55 hover:text-white',
          )}
        >
          <Icon className={cn(active ? 'h-6 w-6' : 'h-5 w-5')} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function NavRail<Id extends string>({
  items,
  active,
  onChange,
  onHelp,
}: {
  items: NavItem<Id>[]
  active: Id
  onChange: (id: Id) => void
  /** Ajuda ainda não configurada: sem handler o botão existe, mas não faz nada. */
  onHelp?: () => void
}) {
  return (
    <nav
      aria-label="Seções"
      className="sticky top-0 z-30 flex h-screen w-[76px] shrink-0 flex-col items-center gap-2 bg-[var(--rail-bg)] py-5"
    >
      <img src="/TP.png" alt="" aria-hidden="true" className="mb-4 h-10 w-10 object-contain" />
      {/* Ícones no centro vertical da barra; logotipo no topo e Ajuda embaixo. */}
      <ul className="my-auto flex flex-col items-center gap-6">
        {items.map((item) => (
          <li key={item.id}>
            <RailButton
              label={item.label}
              icon={item.icon}
              active={item.id === active}
              onClick={() => onChange(item.id)}
            />
          </li>
        ))}
      </ul>
      <div>
        <RailButton label="Ajuda" icon={CircleHelp} onClick={onHelp} />
      </div>
    </nav>
  )
}
