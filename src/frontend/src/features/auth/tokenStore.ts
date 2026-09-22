/**
 * Estado de autenticação fora do React: `ApiSource` (Fase 2) precisa ler o
 * token e disparar logout em um 401 sem depender do ciclo de vida de
 * componentes. `authStore.tsx` é a casca React em cima deste módulo.
 *
 * Persistência em `sessionStorage` (não `localStorage`): a sessão não deve
 * sobreviver ao fechamento da aba, conforme a Fase 2 do plano.
 */

export interface AuthUser {
  username: string
  display_name: string
  role: string
}

export interface AuthSession {
  token: string
  expiresAt: number // epoch ms
  user: AuthUser
}

const STORAGE_KEY = 'thermal-predictor.auth.v1'

let session: AuthSession | null = loadFromStorage()
const listeners = new Set<() => void>()

function loadFromStorage(): AuthSession | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.token || !parsed?.expiresAt || !parsed?.user) return null
    if (parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function persist(): void {
  if (typeof sessionStorage === 'undefined') return
  if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else sessionStorage.removeItem(STORAGE_KEY)
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function getSession(): AuthSession | null {
  if (session && session.expiresAt <= Date.now()) {
    session = null
    persist()
  }
  return session
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function setSession(next: AuthSession): void {
  session = next
  persist()
  notify()
}

export function clearSession(): void {
  if (!session) return
  session = null
  persist()
  notify()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Callback chamado pelo `ApiSource` quando a API responde 401 no meio de uma
 * sessão (token expirado/revogado). `authStore.tsx` registra o listener real
 * para mostrar o aviso "Sessão expirada" e redirecionar ao login.
 */
type ExpiredHandler = () => void
let expiredHandler: ExpiredHandler | null = null

export function onSessionExpired(handler: ExpiredHandler | null): void {
  expiredHandler = handler
}

export function notifySessionExpired(): void {
  clearSession()
  expiredHandler?.()
}
