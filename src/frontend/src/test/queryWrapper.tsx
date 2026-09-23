/**
 * Envelope de testes para componentes que consultam dados via TanStack Query
 * (a aba de Métricas, desde a v1.1). `retry: false` e cache desligado para o
 * teste falhar na hora em vez de esperar reentativas.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  })
}

export function QueryWrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

/** `render` com o provider já montado. */
export function renderWithQuery(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: QueryWrapper, ...options })
}
