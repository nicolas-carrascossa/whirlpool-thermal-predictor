/**
 * Casca da aplicação: barra superior + painéis fixos de configuração e histórico
 * ao redor da área de resultados. Abaixo de 1024 px os painéis se empilham.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function SidebarToggle({
  isOpen,
  onClick,
  panelId,
  openLabel,
  closeLabel,
  side,
  className,
}: {
  isOpen: boolean
  onClick: () => void
  panelId: string
  openLabel: string
  closeLabel: string
  side: 'left' | 'right'
  className?: string
}) {
  const label = isOpen ? closeLabel : openLabel
  const iconPointsInward = side === 'left' ? isOpen : !isOpen

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-controls={panelId}
      aria-expanded={isOpen}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'h-9 w-9 rounded-full border-wp-core bg-wp-core p-0 text-white shadow-sm hover:bg-wp-core/90 hover:text-white',
        className,
      )}
    >
      {iconPointsInward ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
    </Button>
  )
}

export function AppShell({
  userDisplayName,
  onLogout,
  sidebar,
  historySidebar,
  children,
}: {
  /** Nome do usuário autenticado. */
  userDisplayName?: string
  onLogout?: () => void
  sidebar: ReactNode
  /** Painel opcional de consultas recentes, exibido à direita dos resultados. */
  historySidebar?: ReactNode
  children: ReactNode
}) {
  const headerRef = useRef<HTMLElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true)

  // O header quebra em 2 linhas (flex-wrap) dependendo do nome do usuário e
  // dos botões visíveis, então sua altura real varia entre telas/máquinas.
  // Medimos em runtime em vez de assumir um valor fixo em px, para que o
  // painel lateral (sticky) sempre alinhe com o rodapé real do header.
  useLayoutEffect(() => {
    const headerEl = headerRef.current
    if (!headerEl) return
    const root = document.documentElement
    const updateHeaderHeight = () => {
      root.style.setProperty('--header-h', `${headerEl.offsetHeight}px`)
    }
    updateHeaderHeight()
    const observer = new ResizeObserver(updateHeaderHeight)
    observer.observe(headerEl)
    return () => observer.disconnect()
  }, [])
  return (
    <div className="min-h-screen bg-white text-wp-gray85">
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-wp-gray12 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <div className="flex min-w-0 flex-col">
            <h1 className="font-display text-xl font-bold uppercase leading-tight tracking-[0.05em] text-wp-accent">
              Thermal Predictor
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {userDisplayName && (
              <span className="whitespace-nowrap font-body text-sm text-wp-gray65">
                {userDisplayName}
              </span>
            )}
            {onLogout && (
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Sair
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start">
        <div
          className={cn(
            'relative shrink-0 lg:sticky lg:top-[var(--header-h)] lg:max-h-[calc(100vh-var(--header-h)-24px)]',
            isSidebarOpen ? 'w-full lg:w-[340px]' : 'w-full lg:w-0',
          )}
        >
          <div className="flex justify-end pb-2 lg:hidden">
            <SidebarToggle
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
              panelId="dashboard-sidebar"
              openLabel="Abrir painel de configurações"
              closeLabel="Fechar painel de configurações"
              side="left"
            />
          </div>
          <aside
            id="dashboard-sidebar"
            className={cn(
              'w-full lg:max-h-[calc(100vh-var(--header-h)-24px)] lg:overflow-y-auto lg:pr-12',
              !isSidebarOpen && 'hidden',
            )}
          >
            {sidebar}
          </aside>
          <SidebarToggle
            isOpen={isSidebarOpen}
            onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
            panelId="dashboard-sidebar"
            openLabel="Abrir painel de configurações"
            closeLabel="Fechar painel de configurações"
            side="left"
            className={cn(
              'absolute z-10 hidden lg:inline-flex',
              isSidebarOpen ? 'right-3 top-3' : '-left-4 top-0',
            )}
          />
        </div>
        <main className="dashboard-results min-w-0 flex-1">{children}</main>
        {historySidebar && (
          <div
            className={cn(
              'relative shrink-0 lg:sticky lg:top-[var(--header-h)] lg:max-h-[calc(100vh-var(--header-h)-24px)]',
              isHistorySidebarOpen ? 'w-full lg:w-[280px]' : 'w-full lg:w-0',
            )}
          >
            <div className="flex justify-start pb-2 lg:hidden">
              <SidebarToggle
                isOpen={isHistorySidebarOpen}
                onClick={() => setIsHistorySidebarOpen((isOpen) => !isOpen)}
                panelId="dashboard-history-sidebar"
                openLabel="Abrir painel de histórico"
                closeLabel="Fechar painel de histórico"
                side="right"
              />
            </div>
            <aside
              id="dashboard-history-sidebar"
              className={cn(
                'w-full lg:max-h-[calc(100vh-var(--header-h)-24px)] lg:overflow-y-auto lg:pl-14',
                !isHistorySidebarOpen && 'hidden',
              )}
            >
              {historySidebar}
            </aside>
            <SidebarToggle
              isOpen={isHistorySidebarOpen}
              onClick={() => setIsHistorySidebarOpen((isOpen) => !isOpen)}
              panelId="dashboard-history-sidebar"
              openLabel="Abrir painel de histórico"
              closeLabel="Fechar painel de histórico"
              side="right"
              className={cn(
                'absolute z-10 hidden lg:inline-flex',
                isHistorySidebarOpen ? 'left-3 top-3' : '-right-4 top-0',
              )}
            />
          </div>
        )}
      </div>

      <footer className="border-t border-wp-gray12 px-6 py-3">
        <p className="mx-auto max-w-[1600px] font-mono text-[11px] text-wp-gray45">
          Geometria 3D ilustrativa — não é CAD
        </p>
      </footer>
    </div>
  )
}
