/**
 * Casca da aplicação: barra de navegação preta à esquerda (só ícones), área de
 * resultados ao centro e, à direita, o painel com o usuário e a configuração do
 * fogão. Fundo cinza; cada bloco é um cartão branco por cima.
 *
 * Em notebooks, as três colunas permanecem lado a lado e ficam mais compactas.
 * O painel da direita só se empilha em telas estreitas (celulares/tablets).
 */

import type { ReactNode } from 'react'

export function AppShell({
  nav,
  title,
  section,
  headerRight,
  configSidebar,
  children,
}: {
  /** Modo `local` (mock). */
  isMock: boolean
  /** Barra de navegação lateral (`NavRail`). */
  nav: ReactNode
  title: ReactNode
  /** Nome da seção ativa, mostrado sob o título. */
  section: string
  /** Informações e ações do cabeçalho, alinhadas à direita. */
  headerRight?: ReactNode
  /** Painel da direita (usuário + configuração do fogão). */
  configSidebar?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="dashboard-shell flex min-h-screen bg-background text-wp-gray85">
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="dashboard-layout mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-6 py-3 min-[900px]:flex-row min-[900px]:items-start">
          {/* Tudo branco: cabeçalho e conteúdo separados por linhas, sem blocos nem sombras. */}
          <div className="min-w-0 flex-1">
            <header className="dashboard-header flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-border px-5 py-2">
              <div className="min-w-0">
                <div className="font-display text-xl font-extrabold leading-tight text-wp-gray85">{title}</div>
                <p className="mt-0.5 truncate text-sm text-wp-gray65">{section}</p>
              </div>
              {headerRight && <div className="dashboard-header-actions ml-auto mt-4 flex flex-wrap items-center justify-end gap-3">{headerRight}</div>}
            </header>
            <main className="dashboard-results min-w-0 px-5 pb-5">{children}</main>
          </div>
          {configSidebar && (
            // Sempre visível. Rola por dentro se a tela for baixa, mas sem mostrar a barra de rolagem.
            <aside
              id="dashboard-config-sidebar"
              className="dashboard-config-sidebar w-full shrink-0 border-t border-border bg-white pt-4 min-[900px]:sticky min-[900px]:top-3 min-[900px]:max-h-[calc(100vh-24px)] min-[900px]:w-[clamp(232px,24vw,344px)] min-[900px]:overflow-y-auto min-[900px]:border-l min-[900px]:border-t-0 min-[900px]:pl-6 min-[900px]:pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {configSidebar}
            </aside>
          )}
        </div>

      </div>
    </div>
  )
}
