/**
 * Casca React sobre `tokenStore`. Só é montada em `VITE_DATA_SOURCE=api`
 * (ver `RequireAuth`/`App.tsx`) — no modo `local` a Fase 1 continua sem login.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { fetchMe, login as loginRequest } from '@/features/auth/api'
import {
  clearSession,
  getSession,
  onSessionExpired,
  setSession,
  subscribe,
  type AuthUser,
} from '@/features/auth/tokenStore'

interface AuthState {
  user: AuthUser | null
  /** `true` enquanto valida um token existente (`/auth/me`) ao carregar a aplicação. */
  isValidating: boolean
  /** `true` logo após uma expiração de sessão detectada em uma chamada da API. */
  sessionExpired: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  dismissSessionExpired: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSession()?.user ?? null)
  const [isValidating, setIsValidating] = useState(() => getSession() !== null)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => subscribe(() => setUser(getSession()?.user ?? null)), [])

  useEffect(() => {
    onSessionExpired(() => {
      setSessionExpired(true)
    })
    return () => onSessionExpired(null)
  }, [])

  // Ao carregar a aplicação com um token persistido em sessionStorage, valida
  // contra `/auth/me` — um token revogado no servidor não deve parecer válido.
  useEffect(() => {
    const existing = getSession()
    if (!existing) {
      setIsValidating(false)
      return
    }
    let cancelled = false
    fetchMe(existing.token)
      .then((freshUser) => {
        if (cancelled) return
        setSession({ ...existing, user: freshUser })
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
      })
      .finally(() => {
        if (!cancelled) setIsValidating(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const nextSession = await loginRequest(username, password)
    setSession(nextSession)
    setSessionExpired(false)
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [])

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), [])

  const value = useMemo<AuthState>(
    () => ({ user, isValidating, sessionExpired, login, logout, dismissSessionExpired }),
    [user, isValidating, sessionExpired, login, logout, dismissSessionExpired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')
  return ctx
}
