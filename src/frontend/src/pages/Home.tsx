/**
 * Tela principal do Thermal Predictor: configurar → prever → ler resultados.
 * Toda a leitura de dados passa por `PredictionSource`; nada aqui sabe se a
 * origem é o mock local ou a API da Fase 2.
 */

import { useEffect, useState } from 'react'
import { OctagonAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfigPanel } from '@/features/config/ConfigPanel'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { HistoryPanel } from '@/features/history/HistoryPanel'
import { useAuth } from '@/features/auth/authStore'
import { isApiMode } from '@/features/auth/RequireAuth'
import { ResultsPanel, type ResultsTab } from '@/features/results/ResultsPanel'
import {
  useMetadataQuery,
  usePredictionQuery,
  useReferencePredictionQuery,
} from '@/hooks/useThermalQueries'

function HomeContent() {
  const store = useConfigStore()
  const prediction = usePredictionQuery(store.request)
  const referencePrediction = useReferencePredictionQuery(
    store.request,
    store.metadata?.reference_config,
  )
  const apiMode = isApiMode()
  const isMock = !apiMode
  const isReferenceConfig =
    !!store.config &&
    !!store.metadata &&
    JSON.stringify(store.config) === JSON.stringify(store.metadata.reference_config)

  // `AuthProvider` envolve toda a aplicação (ver App.tsx), então o hook é
  // sempre seguro de chamar; seus valores só importam em modo `api`.
  const auth = useAuth()
  const navigate = useNavigate()

  // Aba ativa da área de resultados; vive aqui porque o botão que abre o mapa
  // fica na barra superior (AppShell) e as abas ficam no ResultsPanel.
  const [resultsTab, setResultsTab] = useState<ResultsTab>('resultados')

  useEffect(() => {
    if (apiMode && auth.sessionExpired) {
      navigate('/login', { replace: true })
    }
  }, [apiMode, auth.sessionExpired, navigate])

  // O identificador da consulta é gerado pela fonte de predição. Assim que a
  // resposta atual chega, ele é associado ao snapshot salvo ao clicar em
  // "Prever"; `isPlaceholderData` evita usar a resposta da consulta anterior.
  useEffect(() => {
    if (!store.request || !prediction.data || prediction.isPlaceholderData) return
    store.recordHistoryPrediction(store.request, prediction.data)
  }, [prediction.data, prediction.isPlaceholderData, store])

  return (
    <AppShell
      isMock={isMock}
      userDisplayName={apiMode ? auth.user?.display_name : undefined}
      onLogout={apiMode ? auth.logout : undefined}
      sidebar={<ConfigPanel />}
      historySidebar={<HistoryPanel />}
    >
      {apiMode && auth.sessionExpired && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-status-warn bg-orange-50 px-4 py-3 font-body text-sm text-wp-gray85"
        >
          Sessão expirada — entre novamente.
        </div>
      )}
      <ResultsPanel
        metadata={store.metadata}
        response={prediction.data}
        request={store.request}
        referenceResponse={referencePrediction.data}
        isReferenceConfig={isReferenceConfig}
        isLoading={prediction.isFetching && !prediction.data}
        error={prediction.error}
        hasRequest={store.request !== null}
        selectedKeyArea={store.selectedKeyArea}
        onSelectKeyArea={store.selectKeyArea}
        draftConfig={store.config}
        hoveredVariable={store.hoveredVariable}
        highlightPart={store.highlightPart}
        onHoverVariable={store.setHoveredVariable}
        activeTab={resultsTab}
        onTabChange={setResultsTab}
      />
    </AppShell>
  )
}

export function HomePage() {
  const metadata = useMetadataQuery()

  if (metadata.error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Card>
          <CardContent
            role="alert"
            className="flex flex-col items-center gap-2 px-6 py-14 text-center"
          >
            <OctagonAlert className="h-6 w-6 text-status-danger" strokeWidth={1.5} aria-hidden="true" />
            <h1 className="font-display text-lg font-semibold text-wp-gray85">
              Não foi possível carregar os metadados
            </h1>
            <p className="text-sm leading-relaxed text-wp-gray65">
              {metadata.error instanceof Error
                ? metadata.error.message
                : 'Erro desconhecido ao carregar os metadados.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <ConfigStoreProvider metadata={metadata.data}>
        <HomeContent />
      </ConfigStoreProvider>
    </TooltipProvider>
  )
}
