/**
 * Fonte de dados única: a interface fala sempre com o FastAPI de
 * `src/backend` (`ApiSource`), que responde com os modelos treinados.
 */

import type { PredictionSource } from '@/contract/v1'

import { ApiSource } from './ApiSource'

export * from './ApiSource'

let cached: PredictionSource | null = null

export function getPredictionSource(): PredictionSource {
  if (!cached) cached = new ApiSource()
  return cached
}

/** Apenas para testes: descarta a instância memoizada. */
export function resetPredictionSource(): void {
  cached = null
}
