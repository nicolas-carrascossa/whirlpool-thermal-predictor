/**
 * Seleção da fonte de dados.
 *
 * O produto fala SEMPRE com o FastAPI de `src/backend`, que responde com os
 * modelos treinados (`MODEL_MODE=real`, também o padrão do back-end). O
 * `LocalMockSource` — gerador sintético que roda no navegador — só existe para
 * os testes automatizados: fora do modo `test` a variável `VITE_DATA_SOURCE=local`
 * é rejeitada, para que dado sintético nunca apareça como predição do modelo.
 */

import type { PredictionSource } from '@/contract/v1'

import { ApiSource } from './ApiSource'
import { LocalMockSource } from './LocalMockSource'

export * from './LocalMockSource'
export * from './ApiSource'

export type DataSourceName = 'local' | 'api'

let cached: PredictionSource | null = null

/** Fonte ativa. É a única leitura de `VITE_DATA_SOURCE` na aplicação. */
export function getDataSourceName(): DataSourceName {
  const name = (import.meta.env.VITE_DATA_SOURCE ?? 'api') as string
  if (name === 'api') return 'api'
  if (name === 'local' && import.meta.env.MODE === 'test') return 'local'
  if (name === 'local') {
    throw new Error(
      'VITE_DATA_SOURCE=local (dados sintéticos) só é aceito nos testes. ' +
        'Use "api" para obter as predições do modelo treinado.',
    )
  }
  throw new Error(`Fonte de dados desconhecida: "${name}". Use "api".`)
}

export function getPredictionSource(): PredictionSource {
  if (cached) return cached
  cached = getDataSourceName() === 'api' ? new ApiSource() : new LocalMockSource()
  return cached
}

/** Apenas para testes: descarta a instância memoizada. */
export function resetPredictionSource(): void {
  cached = null
}
