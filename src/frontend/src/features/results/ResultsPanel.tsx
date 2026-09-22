/**
 * Coluna de resultados: agrupa a resposta por área, ordena pelas áreas mais
 * críticas e cuida dos estados de vazio, carregamento, erro e arquitetura
 * indisponível.
 *
 * O mapa térmico 3D fica numa aba própria ("Mapa térmico"), separada da lista
 * de resultados, para a leitura principal ficar mais enxuta. A aba ativa pode
 * ser controlada de fora (`activeTab`/`onTabChange`) — é assim que o botão
 * "Acessar Mapa térmico" da barra superior chega até aqui.
 */

import { useCallback, useMemo, useState } from 'react'
import { OctagonAlert, SlidersHorizontal, X } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PartId } from '@/components/thermal-map/parts'
import type { MapColorMode } from '@/components/thermal-map/ThermalMap3D'
import {
  ContractError,
  type Metadata,
  type PredictionRequest,
  type PredictionResponse,
  type StoveConfig,
} from '@/contract/v1'
import { AreaCard, type AreaGroup, type SensorFocus } from '@/features/results/AreaCard'
import { ResultsSummary } from '@/features/results/ResultsSummary'
import { ThermalMapSlot } from '@/features/results/ThermalMapSlot'
import { MetricsPanel } from '@/features/metrics/MetricsPanel'
import { ratioOf } from '@/lib/status'

export function groupByArea(response: PredictionResponse, metadata: Metadata | undefined): AreaGroup[] {
  const labels = new Map((metadata?.key_areas ?? []).map((a) => [a.name, a.label_pt]))
  const byArea = new Map<string, AreaGroup>()

  for (const p of response.predictions) {
    let group = byArea.get(p.key_area)
    if (!group) {
      group = {
        name: p.key_area,
        label_pt: labels.get(p.key_area) ?? p.key_area,
        predictions: [],
        maxRatio: null,
        maxTemp: Number.NEGATIVE_INFINITY,
        worstSensor: null,
        singleLimit: null,
      }
      byArea.set(p.key_area, group)
    }
    group.predictions.push(p)
    if (p.temp_c > group.maxTemp) group.maxTemp = p.temp_c
    const ratio = ratioOf(p)
    if (ratio !== null) {
      if (group.maxRatio === null || ratio > group.maxRatio) {
        group.maxRatio = ratio
        group.worstSensor = p
      }
    }
  }

  // Uma única linha de referência nas barras só faz sentido quando todos os
  // sensores da área compartilham o mesmo limite normativo — caso contrário
  // ela compararia sensores com limites diferentes e vira ruído visual.
  for (const group of byArea.values()) {
    const limits = new Set(
      group.predictions.map((p) => p.active_limit_c).filter((l): l is number => l !== null),
    )
    group.singleLimit = limits.size === 1 ? [...limits][0] : null
  }

  // Áreas com limite normativo primeiro (pior razão no topo); áreas apenas de
  // monitoramento ficam por último, ordenadas pela temperatura máxima.
  return [...byArea.values()].sort((a, b) => {
    if (a.maxRatio === null && b.maxRatio === null) return b.maxTemp - a.maxTemp
    if (a.maxRatio === null) return 1
    if (b.maxRatio === null) return -1
    return b.maxRatio - a.maxRatio
  })
}

function Placeholder({
  icon: Icon,
  title,
  text,
  tone = 'neutral',
}: {
  icon: typeof SlidersHorizontal
  title: string
  text: string
  tone?: 'neutral' | 'danger'
}) {
  return (
    <Card>
      <CardContent
        className="flex flex-col items-center gap-2 px-6 py-14 text-center"
        role={tone === 'danger' ? 'alert' : undefined}
      >
        <Icon
          className={tone === 'danger' ? 'h-6 w-6 text-status-danger' : 'h-6 w-6 text-wp-gray45'}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="font-display text-lg font-semibold text-wp-gray85">{title}</h2>
        <p className="max-w-md text-sm leading-relaxed text-wp-gray65">{text}</p>
      </CardContent>
    </Card>
  )
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando resultados">
      <div className="h-32 animate-pulse rounded-lg bg-wp-gray05" />
      <div className="h-56 animate-pulse rounded-lg bg-wp-gray05" />
      <div className="h-56 animate-pulse rounded-lg bg-wp-gray05" />
    </div>
  )
}

/** Abas da área de resultados. */
export type ResultsTab = 'resultados' | 'mapa' | 'metricas'

export function ResultsPanel({
  metadata,
  response,
  request,
  referenceResponse,
  isReferenceConfig = false,
  isLoading,
  error,
  hasRequest,
  selectedKeyArea = null,
  onSelectKeyArea,
  draftConfig = null,
  hoveredVariable = null,
  highlightPart = null,
  onHoverVariable,
  activeTab,
  onTabChange,
}: {
  metadata: Metadata | undefined
  response: PredictionResponse | undefined
  /** Requisição submetida que gerou `response` — usada para mostrar a config na tela. */
  request?: PredictionRequest | null
  referenceResponse?: PredictionResponse | undefined
  isReferenceConfig?: boolean
  isLoading: boolean
  error: unknown
  hasRequest: boolean
  selectedKeyArea?: string | null
  onSelectKeyArea?: (area: string | null) => void
  /** Rascunho do formulário (Fase 1c) — alimenta o 3D em tempo real e o aviso de pré-visualização. */
  draftConfig?: StoveConfig | null
  hoveredVariable?: keyof StoveConfig | null
  highlightPart?: PartId | null
  onHoverVariable?: (field: keyof StoveConfig | null) => void
  /** Aba ativa. Sem a prop, o painel controla a aba sozinho (começa em "resultados"). */
  activeTab?: ResultsTab
  onTabChange?: (tab: ResultsTab) => void
}) {
  // Etapa B: "Status (limite)" é o modo padrão — a pergunta do engenheiro é
  // onde o limite estoura, não onde está mais quente.
  const [mapMode, setMapMode] = useState<MapColorMode>('status')
  const [sensorFocus, setSensorFocus] = useState<(SensorFocus & { area: string }) | null>(null)
  // Aba controlada de fora quando `activeTab` vem por prop; senão, estado local.
  const [internalTab, setInternalTab] = useState<ResultsTab>('resultados')
  const tab = activeTab ?? internalTab
  const setTab = useCallback(
    (next: ResultsTab) => {
      setInternalTab(next)
      onTabChange?.(next)
    },
    [onTabChange],
  )
  const submittedConfig = request?.config ?? null
  const isPreview =
    !!draftConfig && !!submittedConfig && JSON.stringify(draftConfig) !== JSON.stringify(submittedConfig)

  const groups = useMemo(
    () => (response ? groupByArea(response, metadata) : []),
    [response, metadata],
  )

  /**
   * Clique num pino de sensor no mapa 3D: garante que a área esteja visível
   * (o filtro de área é limpo se esconderia a linha), volta para a aba de
   * resultados e pede ao `AreaCard` que role e destaque a linha correspondente.
   */
  const handleSelectSensor = useCallback(
    (tcNumber: number) => {
      const prediction = response?.predictions.find((p) => p.tc_number === tcNumber)
      if (!prediction) return
      if (selectedKeyArea && selectedKeyArea !== prediction.key_area) onSelectKeyArea?.(null)
      setSensorFocus({ tcNumber, area: prediction.key_area, token: Date.now() })
      setTab('resultados')
    },
    [response, selectedKeyArea, onSelectKeyArea, setTab],
  )

  const visibleGroups = selectedKeyArea
    ? groups.filter((g) => g.name === selectedKeyArea)
    : groups
  const selectedLabel = selectedKeyArea
    ? groups.find((g) => g.name === selectedKeyArea)?.label_pt ?? selectedKeyArea
    : null

  const body = (() => {
    if (error) {
      const message =
        error instanceof ContractError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Erro desconhecido ao gerar a predição.'
      // A rede indisponível em modo api é a causa mais comum e mais confusa
      // de investigar sem uma dica direta para onde olhar.
      const isNetworkError = error instanceof ContractError && error.field === 'network'
      return (
        <Placeholder
          icon={OctagonAlert}
          tone="danger"
          title="Não foi possível gerar a predição"
          text={
            isNetworkError
              ? `${message} Verifique se a API está em execução em VITE_API_BASE_URL.`
              : message
          }
        />
      )
    }

    if (!hasRequest) {
      return (
        <Placeholder
          icon={SlidersHorizontal}
          title="Nenhuma consulta ainda"
          text="Selecione uma configuração e clique em Prever."
        />
      )
    }

    if (isLoading || !response) return <ResultsSkeleton />

    if (!response.architecture_available) {
      return (
        <Placeholder
          icon={OctagonAlert}
          title="Arquitetura indisponível"
          text="Sem dados de treino para a arquitetura México. A base atual cobre apenas a arquitetura Brasil; a interface já está pronta para receber o modelo do México sem mudança de tela."
        />
      )
    }

    if (response.predictions.length === 0) {
      return (
        <Placeholder
          icon={SlidersHorizontal}
          title="Nenhum sensor no recorte"
          text="O recorte de áreas e sensores não retornou nenhum sensor. Amplie a seleção no painel à esquerda."
        />
      )
    }

    return (
      <>
        <ResultsSummary
          response={response}
          metadata={metadata}
          request={request ?? null}
          isPreview={isPreview}
        />
        {selectedKeyArea && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectKeyArea?.(null)}
              className="flex items-center gap-1.5 rounded-full border border-wp-accent bg-wp-accentLt px-3 py-1 font-body text-xs font-semibold text-wp-core transition-colors hover:bg-wp-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Filtrando: {selectedLabel}
              <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
        {visibleGroups.map((group) => (
          <AreaCard
            key={group.name}
            group={group}
            focus={sensorFocus && sensorFocus.area === group.name ? sensorFocus : null}
          />
        ))}
      </>
    )
  })()

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as ResultsTab)}>
      <TabsList aria-label="Seções dos resultados">
        <TabsTrigger value="resultados">Resultados</TabsTrigger>
        <TabsTrigger value="mapa">Mapa térmico</TabsTrigger>
        <TabsTrigger value="metricas">Métricas Estatísticas</TabsTrigger>
      </TabsList>
      <TabsContent value="resultados" className="mt-4 flex flex-col gap-4">
        {body}
      </TabsContent>
      {/* A aba inativa é desmontada pelo Radix: o canvas WebGL (frameloop
          "always") não fica renderizando escondido. */}
      <TabsContent value="mapa" className="mt-4">
        <ThermalMapSlot
          metadata={metadata}
          response={response}
          referenceResponse={referenceResponse}
          isReferenceConfig={isReferenceConfig}
          mode={mapMode}
          onModeChange={setMapMode}
          selectedKeyArea={selectedKeyArea}
          onSelectKeyArea={onSelectKeyArea ?? (() => {})}
          onSelectSensor={handleSelectSensor}
          draftConfig={draftConfig}
          submittedConfig={submittedConfig}
          highlightPart={highlightPart}
          hoveredVariable={hoveredVariable}
          onHoverVariable={onHoverVariable}
        />
      </TabsContent>
      {/* Dados simulados (mockMetrics.ts) — nada aqui vem da API. */}
      <TabsContent value="metricas" className="mt-4">
        <MetricsPanel metadata={metadata} />
      </TabsContent>
    </Tabs>
  )
}
