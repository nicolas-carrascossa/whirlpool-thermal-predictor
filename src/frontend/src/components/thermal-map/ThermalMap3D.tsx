import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import type { SensorPrediction, StoveConfig } from '@/contract/v1'
import { Card } from '@/components/ui/card'
import { formatTemp } from '@/lib/format'
import { cn } from '@/lib/utils'

import { absoluteRange, aggregateByKeyArea, formatTempPt, maxAbsDelta, type ZoneAggregate } from './aggregate'
import { cameraForPart } from './cameraForPart'
import { divergentColorForDelta, heatColorForValue, ZONE_GRAY_HEX } from './colorScale'
import { ConfigSummaryOverlay } from './ConfigSummaryOverlay'
import { DEFAULT_CUT_DEPTH } from './cutPlane'
import { legendModel, type MapColorMode } from './legendModel'
import { LegendOverlay } from './LegendOverlay'
import { MapToolbar } from './MapToolbar'
import { FALLBACK_CONFIG, type PartId } from './parts'
import { buildSensorPins } from './SensorPins'
import { DEFAULT_OPENINGS, type OpeningState, type StoveView } from './StoveContext'
import { ThermalMapScene, type CameraPreset, type ZoneLabelDatum } from './ThermalMapScene'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import { GEOMETRY_ZONE_KEYS } from './zoneGeometry'
import { ZoneListPanel } from './ZoneListPanel'
import { visibleLabelZones, worstSensorOf, zoneStatusColor, zoneStatusOf, type LabelMode, type ZoneStatus } from './zoneStatus'

export type { MapColorMode }

export interface ThermalMap3DProps {
  /** Predições da consulta atual. */
  predictions: SensorPrediction[]
  /** Predições da configuração de referência, usadas no modo `delta`. */
  referencePredictions?: SensorPrediction[]
  /** Padrão: `status`. */
  mode?: MapColorMode
  /** `key_area` → rótulo em pt-BR (de `Metadata.key_areas`). */
  keyAreaLabels: Record<string, string>
  selectedKeyArea?: string | null
  onSelectKeyArea?: (keyArea: string | null) => void
  /** Clique num pino de sensor: leva à linha da tabela de resultados. */
  onSelectSensor?: (tcNumber: number) => void
  /**
   * Configuração do fogão que as peças 3D representam. Sem ela, o mapa mostra
   * a configuração de referência (To front / Closed / Center / Pyro /
   * No losses / Closed / Aluminium).
   */
  config?: StoveConfig
  /** Vista do corpo. Sem a prop, o controle interno da barra decide. */
  view?: StoveView
  onViewChange?: (view: StoveView) => void
  /** Aberturas semânticas. Sem a prop, o controle interno da barra decide. */
  openings?: OpeningState
  onOpeningsChange?: (openings: OpeningState) => void
  /** Visibilidade dos rótulos de zona. Sem a prop, a barra decide. */
  labelMode?: LabelMode
  onLabelModeChange?: (mode: LabelMode) => void
  /** Preset de câmera. Sem a prop, o controle interno da barra decide. */
  cameraPreset?: CameraPreset
  /** Peça que deve pulsar em `--wp-accent` (~1 s) — usado ao mudar um select. */
  highlightPart?: PartId | null
  className?: string
}

function TooltipCard({ agg, value }: { agg: ZoneAggregate; value: string }) {
  return (
    <div className="whitespace-nowrap rounded-md border border-wp-gray20 bg-white px-3 py-2 shadow-md">
      <p className="font-display text-sm font-semibold text-wp-gray85">{agg.label}</p>
      {agg.hasSensors ? (
        <>
          <p className="tabular text-sm text-wp-core">{value}</p>
          <p className="tabular text-xs text-wp-gray65">
            {agg.n} sensor{agg.n === 1 ? '' : 'es'} · {agg.min !== null ? formatTempPt(agg.min) : '—'}–
            {agg.max !== null ? formatTempPt(agg.max) : '—'}
          </p>
        </>
      ) : (
        <p className="text-xs text-wp-gray45">sem sensores selecionados</p>
      )}
    </div>
  )
}

export function ThermalMap3D({
  predictions,
  referencePredictions,
  mode = 'status',
  keyAreaLabels,
  selectedKeyArea = null,
  onSelectKeyArea,
  onSelectSensor,
  config,
  view,
  onViewChange,
  openings,
  onOpeningsChange,
  labelMode,
  onLabelModeChange,
  cameraPreset,
  highlightPart = null,
  className,
}: ThermalMap3DProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [hoveredPart, setHoveredPart] = useState<PartId | null>(null)
  const [internalView, setInternalView] = useState<StoveView>('solid')
  const [internalCamera, setInternalCamera] = useState<CameraPreset>('iso')
  const [internalOpenings, setInternalOpenings] = useState<OpeningState>(DEFAULT_OPENINGS)
  const [internalLabelMode, setInternalLabelMode] = useState<LabelMode>('alerts')
  const [cutDepth, setCutDepth] = useState(DEFAULT_CUT_DEPTH)
  const [recenterToken, setRecenterToken] = useState(0)
  const [cameraFollowsPart, setCameraFollowsPart] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const lastFollowedPart = useRef<PartId | null>(null)

  const effectiveView = view ?? internalView
  const effectiveCamera = cameraPreset ?? internalCamera
  const effectiveConfig = config ?? FALLBACK_CONFIG
  const effectiveOpenings = openings ?? internalOpenings
  const effectiveLabelMode = labelMode ?? internalLabelMode

  const handleViewChange = useCallback(
    (next: StoveView) => {
      setInternalView(next)
      onViewChange?.(next)
    },
    [onViewChange],
  )

  const handleToggleOpening = useCallback(
    (kind: keyof OpeningState) => {
      // atualização funcional: dois toggles no mesmo tick (ou em React 18 em
      // lote) não podem desfazer um ao outro por closure velha
      setInternalOpenings((prev) => {
        const base = openings ?? prev
        return { ...base, [kind]: !base[kind] }
      })
      onOpeningsChange?.({ ...effectiveOpenings, [kind]: !effectiveOpenings[kind] })
    },
    [effectiveOpenings, openings, onOpeningsChange],
  )

  const handleLabelModeChange = useCallback(
    (next: LabelMode) => {
      setInternalLabelMode(next)
      onLabelModeChange?.(next)
    },
    [onLabelModeChange],
  )

  // "Câmera segue a peça alterada" (Fase 1d, etapa E, padrão OFF): quando a
  // peça pulsa, move o preset (e abre o que for preciso) para o local do
  // fogão onde ela fica visível — só reage a uma peça *nova* pulsando, nunca
  // reexecuta ao alternar o toggle em si.
  useEffect(() => {
    if (!cameraFollowsPart || !highlightPart) return
    if (lastFollowedPart.current === highlightPart) return
    lastFollowedPart.current = highlightPart
    const target = cameraForPart(highlightPart)
    if (!cameraPreset) setInternalCamera(target.preset)
    if (target.openings) {
      setInternalOpenings((prev) => {
        const base = openings ?? prev
        return { ...base, ...target.openings }
      })
      if (onOpeningsChange) onOpeningsChange({ ...effectiveOpenings, ...target.openings })
    }
  }, [cameraFollowsPart, highlightPart, cameraPreset, openings, onOpeningsChange, effectiveOpenings])

  useEffect(() => {
    if (!highlightPart) lastFollowedPart.current = null
  }, [highlightPart])

  const aggregates = useMemo(
    () => aggregateByKeyArea(predictions, keyAreaLabels, mode === 'delta' ? referencePredictions : undefined),
    [predictions, keyAreaLabels, referencePredictions, mode],
  )
  const aggByKey = useMemo(() => new Map(aggregates.map((a) => [a.key, a])), [aggregates])

  const range = useMemo(() => absoluteRange(aggregates), [aggregates])
  const maxDelta = useMemo(() => maxAbsDelta(aggregates), [aggregates])

  const statusByKey = useMemo(() => {
    const map = new Map<string, ZoneStatus>()
    for (const agg of aggregates) map.set(agg.key, zoneStatusOf(predictions, agg.key))
    return map
  }, [aggregates, predictions])

  const legend = useMemo(
    () => legendModel(mode, predictions, referencePredictions),
    [mode, predictions, referencePredictions],
  )

  function colorForAgg(agg: ZoneAggregate): string {
    if (mode === 'status') return zoneStatusColor(predictions, agg.key)
    if (!agg.hasSensors || agg.mean === null) return ZONE_GRAY_HEX
    if (mode === 'delta') {
      if (agg.delta === null) return ZONE_GRAY_HEX
      return divergentColorForDelta(agg.delta, maxDelta)
    }
    return heatColorForValue(agg.mean, range.min, range.max)
  }

  function colorForZoneKey(zoneKey: string): string {
    const agg = aggByKey.get(zoneKey)
    return agg ? colorForAgg(agg) : ZONE_GRAY_HEX
  }

  /** Uma única medida por zona, conforme o modo — usada no rótulo e na lista. */
  const valueFor = useCallback(
    (agg: ZoneAggregate): string => {
      if (!agg.hasSensors) return 'sem sensores'
      if (mode === 'delta') {
        return agg.delta !== null ? `Δ ${formatTempPt(agg.delta, { withSign: true })}` : '—'
      }
      if (mode === 'absolute') {
        return agg.mean !== null ? `média ${formatTemp(agg.mean)}` : '—'
      }
      const worst = worstSensorOf(predictions, agg.key)
      if (!worst || worst.active_limit_c === null) {
        return `máx ${agg.max !== null ? formatTemp(agg.max) : '—'} · monitor`
      }
      return `máx ${formatTemp(worst.temp_c)} / lim ${formatTemp(worst.active_limit_c)}`
    },
    [mode, predictions],
  )

  const zoneLabels: ZoneLabelDatum[] = useMemo(() => {
    const zones = aggregates
      .filter((a) => GEOMETRY_ZONE_KEYS.includes(a.key))
      .map((a) => ({ key: a.key, status: statusByKey.get(a.key) ?? 'none' }))
    const visible = new Set(visibleLabelZones(effectiveLabelMode, zones, selectedKeyArea))
    return aggregates
      .filter((a) => visible.has(a.key))
      .map((a) => ({
        zoneKey: a.key,
        label: a.label,
        value: valueFor(a),
        status: statusByKey.get(a.key) ?? 'none',
      }))
  }, [aggregates, statusByKey, effectiveLabelMode, selectedKeyArea, valueFor])

  const sensorPins = useMemo(
    () => buildSensorPins(predictions, selectedKeyArea),
    [predictions, selectedKeyArea],
  )

  function isZoneActive(zoneKey: string): boolean {
    return hoveredKey === zoneKey || selectedKeyArea === zoneKey
  }

  function handleSelect(key: string) {
    if (!onSelectKeyArea) return
    onSelectKeyArea(selectedKeyArea === key ? null : key)
  }

  function tooltipFor(zoneKey: string) {
    const agg = aggByKey.get(zoneKey)
    if (!agg) return null
    return <TooltipCard agg={agg} value={valueFor(agg)} />
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid gap-4 min-[900px]:grid-cols-[1fr_280px]">
        <Card
          className="relative overflow-hidden bg-wp-gray05"
          style={{ aspectRatio: '4 / 3', minHeight: 460 }}
        >
          <div
            role="img"
            aria-label={`Mapa térmico 3D ilustrativo do fogão, com as ${aggregates.length} áreas coloridas ${
              mode === 'status'
                ? 'pelo status do pior sensor em relação ao limite normativo'
                : mode === 'delta'
                  ? 'pela temperatura em relação à configuração de referência'
                  : 'pela temperatura prevista'
            }. Os valores detalhados de cada área estão na lista ao lado.`}
            className="absolute inset-0"
          >
            <Canvas
              dpr={[1, 2]}
              frameloop="always"
              gl={{ alpha: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
              camera={{ fov: 38, position: [36, 25, 42] }}
              onCreated={({ gl }) => {
                gl.toneMappingExposure = 1.05
              }}
            >
              <ThermalMapScene
                colorFor={colorForZoneKey}
                isZoneActive={isZoneActive}
                onHoverZone={setHoveredKey}
                onUnhoverZone={(key) => setHoveredKey((current) => (current === key ? null : current))}
                onClickZone={handleSelect}
                tooltipFor={tooltipFor}
                view={effectiveView}
                cutDepth={cutDepth}
                config={effectiveConfig}
                openings={effectiveOpenings}
                highlightPart={highlightPart}
                onHoverPart={setHoveredPart}
                autoRotate={false}
                reducedMotion={prefersReducedMotion}
                cameraPreset={effectiveCamera}
                recenterToken={recenterToken}
                zoneLabels={zoneLabels}
                selectedKeyArea={selectedKeyArea}
                sensorPins={sensorPins}
                onSelectSensor={onSelectSensor}
              />
            </Canvas>
          </div>

          <MapToolbar
            openings={effectiveOpenings}
            onToggleOpening={handleToggleOpening}
            labelMode={effectiveLabelMode}
            onLabelModeChange={handleLabelModeChange}
            view={effectiveView}
            onViewChange={handleViewChange}
            cutDepth={cutDepth}
            onCutDepthChange={setCutDepth}
            cameraPreset={effectiveCamera}
            onCameraPresetChange={setInternalCamera}
            onRecenter={() => setRecenterToken((n) => n + 1)}
            cameraFollowsPart={cameraFollowsPart}
            onCameraFollowsPartChange={setCameraFollowsPart}
          />

          <ConfigSummaryOverlay config={effectiveConfig} highlightPart={highlightPart} />
          <LegendOverlay model={legend} />

          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-body text-xs text-wp-gray45">
            Arraste para girar · scroll para zoom
            {hoveredPart ? ' · peça em foco' : ''}
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <ZoneListPanel
            aggregates={aggregates}
            mode={mode}
            hoveredKey={hoveredKey}
            selectedKeyArea={selectedKeyArea}
            onHover={setHoveredKey}
            onSelect={handleSelect}
            colorFor={colorForAgg}
            valueFor={valueFor}
            statusFor={(key) => statusByKey.get(key) ?? 'none'}
          />
        </div>
      </div>

      <p className="tabular text-xs text-wp-gray45">Geometria ilustrativa — não é CAD</p>
    </div>
  )
}
