/**
 * Guarda de rota. Fora do modo `api` (Fase 1, `VITE_DATA_SOURCE=local`) é um
 * passthrough — a demo offline continua sem login. Em modo `api`, redireciona
 * para `/login` preservando a rota de origem em `state.from`.
 */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/authStore'

export function isApiMode(): boolean {
  return (import.meta.env.VITE_DATA_SOURCE ?? 'local') === 'api'
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
