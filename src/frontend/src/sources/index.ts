/**
 * Seleção da fonte de dados por variável de ambiente.
 *
 * `VITE_DATA_SOURCE=api` é o **padrão do projeto** (Fase 3): a interface fala
 * com o FastAPI de `src/backend`, que responde com os modelos treinados quando
 * sobe com `MODEL_MODE=real`. `local` volta ao `LocalMockSource`, que roda
 * inteiramente no navegador, sem back-end e sem login — é a demo offline da
 * Fase 1, preservada.
 *
 * O padrão vive aqui, e não só no `.env`: o `.env` é ignorado pelo git, então
 * um clone novo herdaria o mock sem perceber — e dado de mock parecendo
 * predição real é exatamente o erro que não pode acontecer.
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
  const name = (import.meta.env.VITE_DATA_SOURCE ?? 'api') as DataSourceName
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
