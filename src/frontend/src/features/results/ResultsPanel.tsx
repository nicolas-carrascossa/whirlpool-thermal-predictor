/**
 * Coluna de resultados: resumo, faixa de áreas e o detalhe da área escolhida;
 * cuida dos estados de vazio, carregamento, erro e arquitetura
 * indisponível.
 *
 * O mapa térmico 3D fica numa aba própria ("Mapa térmico"), separada da lista
 * de resultados, para a leitura principal ficar mais enxuta. A aba ativa pode
 * ser controlada de fora (`activeTab`/`onTabChange`) — é assim que o botão
 * "Acessar Mapa térmico" da barra superior chega até aqui.
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { OctagonAlert, SlidersHorizontal } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { PartId } from '@/components/thermal-map/parts'
import type { MapColorMode } from '@/components/thermal-map/ThermalMap3D'
import {
  ContractError,
  type Metadata,
  type PredictionRequest,
  type PredictionResponse,
  type StoveConfig,
} from '@/contract/v1'
import { AnalysisPanel, type BaseOption } from '@/features/analysis/AnalysisPanel'
import { AreaCard, type AreaGroup, type SensorFocus } from '@/features/results/AreaCard'
import { AreaStrip } from '@/features/results/AreaStrip'
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
        // Procedência vinda da própria predição (v1.1).
        algorithm: p.algorithm,
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
          className={tone === 'danger' ? 'h-6 w-6 text-status-danger-ink' : 'h-6 w-6 text-wp-gray45'}
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
export type ResultsTab = 'resultados' | 'mapa' | 'metricas' | 'historico'

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
  mapToolbarContainer = null,
  focusRequest = null,
  activeTab,
  onTabChange,
  historySlot,
  technicianView = true,
  analysisBases = [],
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
  /** Onde o mapa térmico renderiza seus filtros (barra lateral direita). */
  mapToolbarContainer?: HTMLElement | null
  /** Pedido de "ir até a peça" (clique em "Configuração selecionada"). */
  focusRequest?: { part: PartId; token: number } | null
  /** Aba ativa. Sem a prop, o painel controla a aba sozinho (começa em "resultados"). */
  activeTab?: ResultsTab
  onTabChange?: (tab: ResultsTab) => void
  /** Conteúdo da aba "Histórico". Sem ele a aba não aparece. */
  historySlot?: ReactNode
  /** `false` = visão "não técnico": tabela de sensor só mostra quem pede atenção. Padrão `true`. */
  technicianView?: boolean
  /** Consultas do Histórico oferecidas como base de comparação na análise técnica. */
  analysisBases?: BaseOption[]
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

  // Área em exibição: controlada de fora quando `onSelectKeyArea` vem por prop
  // (o store compartilha a escolha com o mapa 3D); senão, estado local.
  const [internalArea, setInternalArea] = useState<string | null>(null)
  const chosenArea = onSelectKeyArea ? selectedKeyArea : internalArea
  const selectArea = useCallback(
    (area: string) => {
      // O store alterna (clicar na mesma limpa); aqui sempre há uma área, então
      // reescolher a atual não faz nada.
      if (area === chosenArea) return
      setInternalArea(area)
      onSelectKeyArea?.(area)
    },
    [chosenArea, onSelectKeyArea],
  )

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
      selectArea(prediction.key_area)
      setSensorFocus({ tcNumber, area: prediction.key_area, token: Date.now() })
      setTab('resultados')
    },
    [response, selectArea, setTab],
  )

  // A área em exibição é sempre uma só. Sem escolha (ou com uma área que a
  // resposta não cobre) abre a mais crítica, que `groupByArea` já põe primeiro.
  const shownGroup = groups.find((g) => g.name === chosenArea) ?? groups[0] ?? null

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
          title="Esperando previsão"
          text="Selecione uma configuração ao lado e clique em Prever para ver os resultados aqui."
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
        <ResultsSummary response={response} />
        <AreaStrip
          areas={metadata?.key_areas ?? groups.map((g) => ({ name: g.name, label_pt: g.label_pt }))}
          groups={groups}
          selected={shownGroup?.name ?? null}
          onSelect={selectArea}
        />
        {shownGroup && (
          <AreaCard
            key={shownGroup.name}
            group={shownGroup}
            focus={sensorFocus && sensorFocus.area === shownGroup.name ? sensorFocus : null}
            technicianView={technicianView}
          />
        )}
        {technicianView && shownGroup && metadata && request && (
          <AnalysisPanel
            metadata={metadata}
            request={request}
            response={response}
            baseOptions={analysisBases}
            keyArea={shownGroup.name}
            keyAreaLabel={shownGroup.label_pt}
          />
        )}
      </>
    )
  })()

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as ResultsTab)}>
      {/* A troca de seção é feita pela barra lateral (`NavRail`); aqui ficam só os painéis. */}
      <TabsContent
        value="resultados"
        className="mt-0 flex flex-col divide-y divide-wp-gray12 [&>*]:py-5"
      >
        {body}
      </TabsContent>
      {/* A aba inativa é desmontada pelo Radix: o canvas WebGL (frameloop
          "always") não fica renderizando escondido. */}
      <TabsContent value="mapa" className="mt-0">
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
          toolbarContainer={mapToolbarContainer}
          focusRequest={focusRequest}
        />
      </TabsContent>
      {/* Métricas reais do conjunto de teste, recortadas a ESTA previsão. */}
      <TabsContent value="metricas" className="mt-0">
        <MetricsPanel
          metadata={metadata}
          keyAreas={[...new Set(response?.predictions.map((p) => p.key_area) ?? [])]}
          response={response ?? undefined}
        />
      </TabsContent>
      {historySlot && (
        <TabsContent value="historico" className="mt-0">
          {historySlot}
        </TabsContent>
      )}
    </Tabs>
  )
}
