/**
 * Seleção da fonte de dados por variável de ambiente.
 * `VITE_DATA_SOURCE=local` (padrão) roda tudo no navegador; `api` usa
 * `ApiSource` (Fase 2), contra o back-end FastAPI — o front não muda, só
 * esta fábrica.
 */

import type { PredictionSource } from '@/contract/v1'

import { ApiSource } from './ApiSource'
import { LocalMockSource } from './LocalMockSource'

export * from './LocalMockSource'
export * from './ApiSource'

export type DataSourceName = 'local' | 'api'

let cached: PredictionSource | null = null

export function getPredictionSource(): PredictionSource {
  if (cached) return cached
  const name = (import.meta.env.VITE_DATA_SOURCE ?? 'local') as DataSourceName
  if (name === 'api') {
    cached = new ApiSource()
    return cached
  }
  if (name !== 'local') {
    throw new Error(`Fonte de dados desconhecida: "${name}". Use "local" ou "api".`)
  }
  cached = new LocalMockSource()
  return cached
}

/** Apenas para testes: descarta a instância memoizada. */
export function resetPredictionSource(): void {
  cached = null
}
