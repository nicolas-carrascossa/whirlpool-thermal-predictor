/**
 * Card do mapa térmico 3D. O componente pesado (`three` + `@react-three/*`)
 * é carregado sob demanda via `React.lazy`: o chunk principal não paga o
 * custo dele em quem nunca rola até esta seção.
 */

import { lazy, Suspense, useMemo } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VARIABLE_TO_PART, type PartId } from '@/components/thermal-map/parts'
import type { MapColorMode } from '@/components/thermal-map/ThermalMap3D'
import type { Metadata, PredictionResponse, StoveConfig } from '@/contract/v1'
import { cn } from '@/lib/utils'

/** Compara as 7 variáveis da configuração (ignora `targets`/arquitetura). */
function configsDiffer(a: StoveConfig | null | undefined, b: StoveConfig | null | undefined): boolean {
  if (!a) return false
  // Sem `b` (nenhuma previsão submetida ainda), o rascunho já é "divergente".
  if (!b) return true
  return JSON.stringify(a) !== JSON.stringify(b)
}

const ThermalMap3D = lazy(() =>
  import('@/components/thermal-map/ThermalMap3D').then((m) => ({ default: m.ThermalMap3D })),
)

function MapSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-4"
    >
      <div className="aspect-[4/3] min-h-[420px] animate-pulse rounded-lg border border-wp-gray12 bg-wp-gray05 min-[900px]:aspect-auto min-[900px]:h-[calc(100dvh_-_280px)]" />
      <div className="flex flex-col gap-1.5 min-[900px]:hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-md bg-wp-gray05" />
        ))}
      </div>
    </div>
  )
}

/** Os três modos de cor do mapa (Fase 1d, etapa B): status é o padrão. */
const MODE_OPTIONS: { id: MapColorMode; label: string }[] = [
  { id: 'status', label: 'Status (limite)' },
  { id: 'absolute', label: 'Mapa de calor' },
  { id: 'delta', label: 'Δ vs. referência' },
]

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: MapColorMode
  onChange: (mode: MapColorMode) => void
  /** `true` quando a config atual é a referência: só o modo delta é bloqueado. */
  disabled: boolean
}) {
  const group = (
    <div
      role="radiogroup"
      aria-label="Modo de cor do mapa térmico"
      className="flex w-full items-center gap-1 rounded-md border border-wp-gray12 bg-wp-gray05 p-0.5"
    >
      {MODE_OPTIONS.map((option) => {
        const isDisabled = disabled && option.id === 'delta'
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={mode === option.id}
            disabled={isDisabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'min-w-0 flex-1 whitespace-normal rounded-[5px] px-1.5 py-1 font-body text-[11px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
              mode === option.id ? 'bg-wp-core text-white' : 'text-wp-gray65 hover:text-wp-core',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )

  if (!disabled) return group
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{group}</span>
      </TooltipTrigger>
      <TooltipContent>A configuração atual é a referência.</TooltipContent>
    </Tooltip>
  )
}

export function ThermalMapSlot({
  metadata,
  response,
  referenceResponse,
  isReferenceConfig,
  mode,
  onModeChange,
  selectedKeyArea,
  onSelectKeyArea,
  onSelectSensor,
  draftConfig = null,
  submittedConfig = null,
  highlightPart = null,
  hoveredVariable = null,
  toolbarContainer = null,
  focusRequest = null,
}: {
  metadata: Metadata | undefined
  response: PredictionResponse | undefined
  referenceResponse: PredictionResponse | undefined
  isReferenceConfig: boolean
  mode: MapColorMode
  onModeChange: (mode: MapColorMode) => void
  selectedKeyArea: string | null
  onSelectKeyArea: (area: string | null) => void
  /** Clique num pino de sensor no 3D — rola e destaca a linha da tabela. */
  onSelectSensor?: (tcNumber: number) => void
  /** Rascunho do formulário — segue os selects antes de "Prever" (Fase 1c). */
  draftConfig?: StoveConfig | null
  /** Configuração da última predição submetida — usada para o aviso de pré-visualização. */
  submittedConfig?: StoveConfig | null
  /** Peça pulsando após alteração de um select (vem da store). */
  highlightPart?: PartId | null
  /** Variável sob o cursor (select ou linha de "Configuração selecionada") — destaque contínuo. */
  hoveredVariable?: keyof StoveConfig | null
  /** Onde renderizar os filtros do mapa (barra lateral). Sem ele, ficam sobre o canvas. */
  toolbarContainer?: HTMLElement | null
  /** Pedido de "ir até a peça" vindo da store. */
  focusRequest?: { part: PartId; token: number } | null
}) {
  const keyAreaLabels = Object.fromEntries(
    (metadata?.key_areas ?? []).map((a) => [a.name, a.label_pt]),
  )
  const effectiveMode: MapColorMode = isReferenceConfig && mode === 'delta' ? 'status' : mode
  const effectiveHighlightPart = hoveredVariable ? VARIABLE_TO_PART[hoveredVariable] : highlightPart
  const showPreviewNotice = useMemo(
    () => configsDiffer(draftConfig, submittedConfig),
    [draftConfig, submittedConfig],
  )

  return (
    // Sem cartão nem título: o cabeçalho da página já diz "Mapa térmico", e o
    // canvas ocupa toda a área abaixo dele.
    <div>
        <div data-slot="thermal-map" className="relative">
          {!response || response.predictions.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-wp-gray20 bg-wp-gray05 text-xs text-wp-gray65">
              {response ? 'Nenhum sensor no recorte para exibir no mapa.' : 'Aguardando a primeira predição.'}
            </div>
          ) : (
            <Suspense fallback={<MapSkeleton />}>
              <ThermalMap3D
                predictions={response.predictions}
                referencePredictions={referenceResponse?.predictions}
                mode={effectiveMode}
                keyAreaLabels={keyAreaLabels}
                selectedKeyArea={selectedKeyArea}
                onSelectKeyArea={onSelectKeyArea}
                onSelectSensor={onSelectSensor}
                config={draftConfig ?? undefined}
                highlightPart={effectiveHighlightPart}
                overlayZoneList
                toolbarContainer={toolbarContainer}
                focusRequest={focusRequest}
                zonePanelControls={<ModeToggle mode={effectiveMode} onChange={onModeChange} disabled={isReferenceConfig} />}
              />
            </Suspense>
          )}
          {showPreviewNotice && (
            <div
              role="status"
              className="absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded-md border border-wp-accent bg-wp-accentLt px-3 py-1.5 font-body text-xs font-semibold text-wp-core shadow-sm"
            >
              Pré-visualização da configuração — clique em Prever para atualizar as temperaturas
            </div>
          )}
        </div>
    </div>
  )
}
