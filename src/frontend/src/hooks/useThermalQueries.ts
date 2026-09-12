/**
 * Acesso a dados via TanStack Query, sempre através da interface
 * `PredictionSource` — trocar mock por API na Fase 2 não toca nestes hooks.
 */

import { useQuery } from '@tanstack/react-query'

import type { Metadata, PredictionRequest, PredictionResponse, StoveConfig } from '@/contract/v1'
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
 * Predição da configuração de referência (`metadata.reference_config`), com a
 * mesma arquitetura e o mesmo recorte de áreas/sensores da consulta atual —
 * é o que o modo delta do mapa 3D usa como baseline. Barata com o mock (mesma
 * fonte, cacheada por chave); `referenceConfig` vem do metadata para não
 * acoplar este hook a uma fonte de dados específica.
 */
export function useReferencePredictionQuery(
  request: PredictionRequest | null,
  referenceConfig: StoveConfig | undefined,
) {
  const referenceRequest: PredictionRequest | null =
    request && referenceConfig ? { ...request, config: { ...referenceConfig } } : null

  return useQuery<PredictionResponse>({
    queryKey: ['prediction', 'reference', referenceRequest],
    queryFn: () => getPredictionSource().predict(referenceRequest as PredictionRequest),
    enabled: referenceRequest !== null,
    retry: false,
    placeholderData: (previous) => previous,
  })
}
