/**
 * Estado dos modelos treinados no back-end (`/api/v1/system`). Fica fora de
 * `PredictionSource`: não é contrato de predição, e só existe com a API ligada.
 */

import { ContractError } from '@/contract/v1'
import { getToken } from '@/features/auth/tokenStore'

/**
 * - `ready`: modelos treinados carregados;
 * - `training`: a API está gerando os modelos a partir do dataset de `data/`;
 * - `no_dataset`: não há modelos nem dataset — a interface oferece o mock;
 * - `failed`: a geração falhou;
 * - `mock`: a API responde com os dados mockados.
 */
export type ModelState = 'ready' | 'training' | 'no_dataset' | 'failed' | 'mock'

export interface ModelStatus {
  state: ModelState
  message: string
}

function systemUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
  return `${base}/api/v1/system${path}`
}

async function request(path: string, method: 'GET' | 'POST'): Promise<ModelStatus> {
  const headers = new Headers({ Accept: 'application/json' })
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(systemUrl(path), { method, headers })
  } catch {
    throw new ContractError('Não foi possível contactar a API', 'network', null)
  }
  if (!response.ok) {
    throw new ContractError(`Falha na API (HTTP ${response.status})`, 'http', response.status)
  }
  return (await response.json()) as ModelStatus
}

/** `GET /api/v1/system/models`. Sem modelos e com dataset, a chamada já dispara a geração. */
export function fetchModelStatus(): Promise<ModelStatus> {
  return request('/models', 'GET')
}

/** `POST /api/v1/system/mock-mode` — passa a API para os dados mockados até ela reiniciar. */
export function enableMockMode(): Promise<ModelStatus> {
  return request('/mock-mode', 'POST')
}
