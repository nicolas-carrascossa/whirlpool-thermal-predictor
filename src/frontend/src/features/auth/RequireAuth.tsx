/**
 * Guarda de rota. Em modo `api` (o padrão do produto), redireciona para
 * `/login` preservando a rota de origem em `state.from`. Só nos testes
 * automatizados a fonte é o mock local e a guarda vira um passthrough.
 * O modo vem de `getDataSourceName()`, a mesma decisão que escolhe a fonte de
 * dados — duas leituras da variável de ambiente com padrões diferentes já
 * deixaram a interface sem login falando com a API.
 */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/authStore'
import { getDataSourceName } from '@/sources'

export function isApiMode(): boolean {
  return getDataSourceName() === 'api'
}

export function RequireAuth({ children }: { children: ReactNode }) {
  if (!isApiMode()) return <>{children}</>
  return <RequireAuthApiMode>{children}</RequireAuthApiMode>
}

function RequireAuthApiMode({ children }: { children: ReactNode }) {
  const { user, isValidating } = useAuth()
  const location = useLocation()

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-body text-sm text-wp-gray65">Verificando sessão…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
