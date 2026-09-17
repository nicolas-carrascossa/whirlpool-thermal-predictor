/**
 * Casca da aplicação: barra superior + painel de configuração fixo à esquerda
 * (≈340 px) + área de resultados. Abaixo de 1024 px o painel empilha acima dos
 * resultados. Fundo branco dominante, conforme o style guide.
 */

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ArchitectureMeta, Architecture } from '@/contract/v1'
import { cn } from '@/lib/utils'

function ArchitectureSelector({
  architectures,
  value,
  onChange,
}: {
  architectures: ArchitectureMeta[]
  value: Architecture
  onChange: (value: Architecture) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Arquitetura"
      className="flex items-center gap-1 rounded-md border border-wp-gray12 bg-wp-gray05 p-0.5"
    >
      {architectures.map((arch) => {
        const selected = arch.code === value
        const button = (
          <button
            key={arch.code}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Arquitetura ${arch.code} — ${arch.label_pt}`}
            onClick={() => onChange(arch.code)}
            className={cn(
              'rounded-[5px] px-3 py-1 font-body text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'bg-wp-core text-white' : 'text-wp-gray65 hover:text-wp-core',
              !arch.available && 'opacity-60',
            )}
          >
            {arch.code}
          </button>
        )
        if (arch.available) return button
        return (
          <Tooltip key={arch.code}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{arch.label_pt}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function AppShell({
  architectures,
  architecture,
  onArchitectureChange,
  isMock,
  userDisplayName,
  onLogout,
  onOpenThermalMap,
  sidebar,
  children,
}: {
  architectures: ArchitectureMeta[]
  architecture: Architecture
  onArchitectureChange: (value: Architecture) => void
  /** Modo `local` (mock). Hoje só afeta a nota do rodapé. */
  isMock: boolean
  /** Nome do usuário autenticado (modo `api`). Ausente/`undefined` no modo `local`. */
  userDisplayName?: string
  onLogout?: () => void
  /** Abre a aba "Mapa térmico" da área de resultados. Sem a prop, o botão não aparece. */
  onOpenThermalMap?: () => void
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-wp-gray85">
      <header className="sticky top-0 z-30 border-b border-wp-gray12 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.05em] text-wp-accent">
              Inteli × Whirlpool
            </span>
            <h1 className="font-display text-xl font-light leading-tight text-wp-core">
              Thermal Predictor
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {onOpenThermalMap && (
              <Button variant="secondary" size="sm" onClick={onOpenThermalMap}>
                Acessar Mapa térmico
              </Button>
            )}
            {userDisplayName && (
              <span className="whitespace-nowrap font-body text-sm text-wp-gray65">
                {userDisplayName}
              </span>
            )}
            <ArchitectureSelector
              architectures={architectures}
              value={architecture}
              onChange={onArchitectureChange}
            />
            {onLogout && (
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Sair
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:sticky lg:top-[73px] lg:max-h-[calc(100vh-97px)] lg:w-[340px] lg:overflow-y-auto lg:pr-1">
          {sidebar}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-wp-gray12 px-6 py-3">
        <p className="mx-auto max-w-[1600px] font-mono text-[11px] text-wp-gray45">
          Geometria 3D ilustrativa — não é CAD
          {isMock && ' · Dados de demonstração (mock local)'}
        </p>
      </footer>
    </div>
  )
}
