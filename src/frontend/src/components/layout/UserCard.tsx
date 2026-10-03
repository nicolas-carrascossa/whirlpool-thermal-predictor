/**
 * Quem está operando: avatar com iniciais, nome e função. O "Sair" só existe
 * quando há sessão (modo `api`); no modo local não há login e o cartão mostra
 * um usuário de demonstração, sem inventar nome ou função.
 */

import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function UserCard({
  name,
  role,
  onLogout,
}: {
  name: string
  role: string
  onLogout?: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-wp-core font-display text-sm font-extrabold text-white shadow-press"
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-extrabold leading-tight text-wp-gray85">{name}</p>
        <p className="truncate text-xs text-wp-gray65">{role}</p>
      </div>
      {onLogout && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onLogout}
          aria-label="Sair"
          title="Sair"
        >
          <LogOut aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
