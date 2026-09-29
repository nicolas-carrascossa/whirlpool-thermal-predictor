/**
 * Guarda de rota: redireciona para `/login` preservando a rota de origem em
 * `state.from` enquanto não houver sessão válida.
 */

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/authStore'

export function RequireAuth({ children }: { children: ReactNode }) {
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
