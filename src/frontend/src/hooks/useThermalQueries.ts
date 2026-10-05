/**
 * Acesso a dados via TanStack Query, sempre através da interface
 * `PredictionSource` — trocar mock por API na Fase 2 não toca nestes hooks.
 */

import { useQuery } from '@tanstack/react-query'

import type {
  Metadata,
  MetricsResponse,
  PredictionRequest,
  PredictionResponse,
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
