/**
 * Casca da aplicação: barra de navegação preta à esquerda (só ícones), área de
 * resultados ao centro e, à direita, o painel com o usuário e a configuração do
 * fogão. Fundo cinza; cada bloco é um cartão branco por cima.
 *
 * Abaixo de 1024 px o painel da direita se empilha sob os resultados. Ele é fixo:
 * não há botão para recolher.
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
    <div className="flex min-h-screen bg-background text-wp-gray85">
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-6 py-3 lg:flex-row lg:items-start">
          {/* Tudo branco: cabeçalho e conteúdo separados por linhas, sem blocos nem sombras. */}
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-border px-5 py-2">
              <div className="min-w-0">
                <div className="font-display text-xl font-extrabold leading-tight text-wp-gray85">{title}</div>
                <p className="mt-0.5 truncate text-sm text-wp-gray65">{section}</p>
              </div>
              {headerRight && <div className="ml-auto mt-4 flex flex-wrap items-center justify-end gap-3">{headerRight}</div>}
            </header>
            <main className="dashboard-results min-w-0 px-5 pb-5">{children}</main>
          </div>
          {configSidebar && (
            // Sempre visível. Rola por dentro se a tela for baixa, mas sem mostrar a barra de rolagem.
            <aside
              id="dashboard-config-sidebar"
              className="w-full shrink-0 border-t border-border bg-white pt-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:w-[344px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {configSidebar}
            </aside>
          )}
        </div>

      </div>
    </div>
  )
}
