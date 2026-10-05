/**
 * Acesso a dados via TanStack Query, sempre através da interface
 * `PredictionSource` — trocar mock por API na Fase 2 não toca nestes hooks.
 */

import { useQueries, useQuery } from '@tanstack/react-query'

import type {
  Metadata,
  MetricsResponse,
  PredictionRequest,
  PredictionResponse,
  StoveConfig,
} from '@/contract/v1'
import { getPredictionSource } from '@/sources'

export function useMetadataQuery() {
  return useQuery<Metadata>({
    queryKey: ['metadata'],
    queryFn: () => getPredictionSource().getMetadata(),
    staleTime: Infinity,
    retry: false,
  })
}

/** `request` nulo mantém a consulta ociosa (estado vazio da tela). */
export function usePredictionQuery(request: PredictionRequest | null) {
  return useQuery<PredictionResponse>({
    queryKey: ['prediction', request],
    queryFn: () => getPredictionSource().predict(request as PredictionRequest),
    enabled: request !== null,
    retry: false,
    placeholderData: (previous) => previous,
  })
}

/**
 * Métricas de validação por área (v1.1). `areas` vazio busca todas; passar o
 * recorte da consulta mantém a aba de Métricas escopada à configuração
 * submetida, como as outras duas abas.
 */
export function useMetricsQuery(areas: string[] | undefined, enabled = true) {
  return useQuery<MetricsResponse>({
    queryKey: ['metrics', [...(areas ?? [])].sort()],
    queryFn: () => getPredictionSource().getMetrics(areas),
    enabled,
    staleTime: Infinity,
    retry: false,
  })
}

/**
 * Sensibilidade (análise técnica): uma previsão por configuração alternativa,
 * restrita à área analisada. Só dispara com `enabled` — são várias chamadas, então
 * é o usuário quem pede. Cada chave é estável e cacheada, e rodar de novo reaproveita.
 */
export function useSensitivityQueries(
  request: PredictionRequest | null,
  keyArea: string | null,
  configs: StoveConfig[],
  enabled: boolean,
) {
  return useQueries({
    queries: configs.map((config) => {
      const alt: PredictionRequest | null =
        request && keyArea
          ? { architecture: request.architecture, config, targets: { key_areas: [keyArea] } }
          : null
      return {
        queryKey: ['prediction', 'sensitivity', alt],
        queryFn: () => getPredictionSource().predict(alt as PredictionRequest),
        enabled: enabled && alt !== null,
        retry: false,
        staleTime: Infinity,
      }
    }),
  })
}

/**
 * Previsão da configuração de uma base de comparação escolhida pelo usuário
 * (uma consulta do Histórico), com a mesma arquitetura e o mesmo recorte da
 * consulta atual — assim os sensores comparados são os mesmos.
 */
export function useBasePredictionQuery(request: PredictionRequest | null, baseConfig: StoveConfig | null) {
  const baseRequest: PredictionRequest | null =
    request && baseConfig
      ? { architecture: request.architecture, config: { ...baseConfig }, targets: request.targets }
      : null

  return useQuery<PredictionResponse>({
    queryKey: ['prediction', 'base', baseRequest],
    queryFn: () => getPredictionSource().predict(baseRequest as PredictionRequest),
    enabled: baseRequest !== null,
    retry: false,
    staleTime: Infinity,
  })
}
