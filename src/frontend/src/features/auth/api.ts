/**
 * Chamadas de autenticação. Ficam fora de `ApiSource` porque não carregam
 * (nem exigem) o Bearer token — são elas que o produzem.
 */

import { ContractError } from '@/contract/v1'
import type { AuthSession, AuthUser } from '@/features/auth/tokenStore'

function apiBaseUrl(): string {
  // A URL relativa voltaria ao Vite (porta 5173), que nao possui a API.
  // A variavel de ambiente permite sobrescrever esse destino em outros ambientes.
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')
}

function authUrl(path: string): string {
  return `${apiBaseUrl()}/api/v1/auth${path}`
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string }
    return body?.detail ?? fallback
  } catch {
    return fallback
  }
}

/** `POST /api/v1/auth/login`. Lança `ContractError` com a mensagem pt-BR da API em caso de falha. */
export async function login(username: string, password: string): Promise<AuthSession> {
  let response: Response
  try {
    response = await fetch(authUrl('/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }).toString(),
    })
  } catch {
    throw new ContractError('Não foi possível contactar a API', 'network', null)
  }

  if (response.status === 401) {
    const detail = await readErrorDetail(response, 'Usuário ou senha inválidos')
    throw new ContractError(detail, 'credentials', username)
  }
  if (!response.ok) {
    const detail = await readErrorDetail(response, `Falha no login (HTTP ${response.status})`)
    throw new ContractError(detail, 'login', response.status)
  }

  const body = (await response.json()) as LoginResponse
  return {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
    user: body.user,
  }
}

/** `GET /api/v1/auth/me` — usada para validar um token existente ao carregar a aplicação. */
export async function fetchMe(token: string): Promise<AuthUser> {
  let response: Response
  try {
    response = await fetch(authUrl('/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new ContractError('Não foi possível contactar a API', 'network', null)
  }
  if (!response.ok) {
    throw new ContractError('Sessão inválida', 'auth', response.status)
  }
  return (await response.json()) as AuthUser
}
