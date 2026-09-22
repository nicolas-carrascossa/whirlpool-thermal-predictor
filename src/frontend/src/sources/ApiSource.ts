/**
 * `ApiSource` — implementação de `PredictionSource` que fala com o FastAPI da
 * Fase 2 (`src/backend`), atrás do mesmo contrato que `LocalMockSource`.
 *
 * Base URL: `VITE_API_BASE_URL` (padrão `""` → mesma origem, `/api/v1/...`).
 * Anexa `Authorization: Bearer` do `tokenStore`; um 401 vira `AuthError` e
 * dispara o logout global (`notifySessionExpired`); 400/422 viram
 * `ContractError` com o `detail` da API; erro de rede vira `ContractError`
 * genérico.
 */

import { AuthError } from '@/contract/errors'
import {
  ContractError,
  type Metadata,
  type PredictionRequest,
  type PredictionResponse,
  type PredictionSource,
} from '@/contract/v1'
import { getToken, notifySessionExpired } from '@/features/auth/tokenStore'

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
}

function apiUrl(path: string): string {
  return `${apiBaseUrl()}/api/v1${path}`
}

async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string }
    return body?.detail ?? fallback
  } catch {
    return fallback
  }
}

export class ApiSource implements PredictionSource {
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getToken()
    const headers = new Headers(init?.headers)
    headers.set('Accept', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    let response: Response
    try {
      response = await fetch(apiUrl(path), { ...init, headers })
    } catch {
      throw new ContractError('Não foi possível contactar a API', 'network', null)
    }

    if (response.status === 401) {
      const detail = await readErrorDetail(response, 'Não autenticado')
      notifySessionExpired()
      throw new AuthError(detail, 401)
    }

    if (response.status === 422 || response.status === 400) {
      const detail = await readErrorDetail(response, 'Requisição inválida.')
      throw new ContractError(detail, 'request', null)
    }

    if (!response.ok) {
      const detail = await readErrorDetail(response, `Falha na API (HTTP ${response.status})`)
      throw new ContractError(detail, 'http', response.status)
    }

    return (await response.json()) as T
  }

  async getMetadata(): Promise<Metadata> {
    return this.request<Metadata>('/metadata', { method: 'GET' })
  }

  async predict(req: PredictionRequest): Promise<PredictionResponse> {
    return this.request<PredictionResponse>('/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  }
}
