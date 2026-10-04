/**
 * Card do mapa térmico 3D. O componente pesado (`three` + `@react-three/*`)
 * é carregado sob demanda via `React.lazy`: o chunk principal não paga o
 * custo dele em quem nunca rola até esta seção.
 */

import { lazy, Suspense, useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PART_LABEL_PT, VARIABLE_TO_PART, type PartId } from '@/components/thermal-map/parts'
import type { MapColorMode } from '@/components/thermal-map/ThermalMap3D'
import type { Metadata, PredictionResponse, StoveConfig } from '@/contract/v1'
import { cn } from '@/lib/utils'

/** As 6 variáveis com representação física no 3D (`losses` fica de fora). */
const LEGEND_ENTRIES = (Object.entries(VARIABLE_TO_PART) as [keyof StoveConfig, PartId | null][]).filter(
  (entry): entry is [keyof StoveConfig, PartId] => entry[1] !== null,
)

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
      className="grid gap-4 min-[900px]:grid-cols-[1fr_280px]"
    >
      <div
        className="animate-pulse rounded-lg border border-wp-gray12 bg-wp-gray05"
        style={{ aspectRatio: '4 / 3', minHeight: 420 }}
      />
      <div className="flex flex-col gap-1.5">
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
      className="flex w-full flex-wrap items-center gap-1 rounded-md border border-wp-gray12 bg-wp-gray05 p-0.5 min-[1200px]:w-auto min-[1200px]:flex-nowrap"
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
              'min-w-0 flex-1 whitespace-normal rounded-[5px] px-2.5 py-1 font-body text-xs font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 min-[1200px]:flex-none min-[1200px]:whitespace-nowrap',
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

/**
 * Legenda compacta peça ↔ variável sob o mapa 3D: dobra como hint de
 * descoberta (passar o mouse destaca a peça) e como referência rápida do que
 * cada variável controla no fogão.
 */
function PartLegend({
  activePart,
  onHoverVariable,
}: {
  activePart: PartId | null
  onHoverVariable: (field: keyof StoveConfig | null) => void
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5 pt-2"
      role="group"
      aria-label="Peças do fogão 3D e as variáveis que as controlam"
    >
      {LEGEND_ENTRIES.map(([field, part]) => (
        <button
          key={part}
          type="button"
          onMouseEnter={() => onHoverVariable(field)}
          onMouseLeave={() => onHoverVariable(null)}
          onFocus={() => onHoverVariable(field)}
          onBlur={() => onHoverVariable(null)}
          className={cn(
            'rounded-md border px-2.5 py-1 font-body text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activePart === part
              ? 'border-wp-accent bg-wp-accentLt text-wp-core'
              : 'border-wp-gray12 text-wp-gray65 hover:border-wp-accent hover:text-wp-core',
          )}
        >
          {PART_LABEL_PT[part]}
        </button>
      ))}
    </div>
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
  onHoverVariable,
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
  /** Variável sob o cursor (select ou chip da legenda) — destaque contínuo. */
  hoveredVariable?: keyof StoveConfig | null
  onHoverVariable?: (field: keyof StoveConfig | null) => void
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
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Mapa térmico</CardTitle>
      </CardHeader>
      <CardContent>
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
                stackZoneList
                belowMap={<ModeToggle mode={effectiveMode} onChange={onModeChange} disabled={isReferenceConfig} />}
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
        {response && response.predictions.length > 0 && onHoverVariable && (
          <PartLegend activePart={effectiveHighlightPart} onHoverVariable={onHoverVariable} />
        )}
        {isReferenceConfig && (
          <Badge variant="outline" className="mt-2 font-normal">
            Esta é a configuração de referência — modo delta desabilitado.
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
