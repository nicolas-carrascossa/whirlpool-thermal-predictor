import { algorithmLabel } from '@/lib/algorithms'
import type { AlgorithmCode } from '@/contract/v1'
import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'

import type { SensorPrediction, StoveConfig } from '@/contract/v1'
import { Card } from '@/components/ui/card'
import { formatTemp } from '@/lib/format'
import { cn } from '@/lib/utils'

import { absoluteRange, aggregateByKeyArea, formatTempPt, maxAbsDelta, type ZoneAggregate } from './aggregate'
import { cameraForPart } from './cameraForPart'
import { divergentColorForDelta, heatColorForValue, ZONE_GRAY_HEX } from './colorScale'
import { CollapseToggle } from './CollapseToggle'
import { DEFAULT_CUT_DEPTH } from './cutPlane'
import { legendModel, type MapColorMode } from './legendModel'
import { LegendOverlay } from './LegendOverlay'
import { DEFAULT_EXPLODE_AMOUNT } from './explode'
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
  /**
   * Põe a lista de áreas num painel sobre o canvas, à direita (abaixo de
   * "Configuração"), e faz o mapa ocupar a altura da tela: tudo fica visível
   * sem rolar a página. Abaixo de 900 px a lista volta para baixo do mapa.
   */
  overlayZoneList?: boolean
  /** Controles exibidos no topo do painel de áreas (ex.: modo de cor). */
  zonePanelControls?: ReactNode
  /**
   * Elemento fora do canvas (barra lateral) onde os filtros do mapa são
   * renderizados. Sem ele, os filtros ficam no canto do canvas.
   */
  toolbarContainer?: HTMLElement | null
  /** Leva a câmera até a peça (abrindo o que for preciso); muda `token` a cada pedido. */
  focusRequest?: { part: PartId; token: number } | null
  className?: string
}

function TooltipCard({
  agg,
  value,
  algorithm,
}: {
  agg: ZoneAggregate
  value: string
  /** Modelo que atendeu a área; ausente quando a zona está fora do recorte. */
  algorithm?: AlgorithmCode
}) {
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
          {algorithm && (
            <p className="text-xs text-wp-gray45">modelo: {algorithmLabel(algorithm)}</p>
          )}
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
  overlayZoneList = false,
  zonePanelControls,
  toolbarContainer = null,
  focusRequest = null,
  className,
}: ThermalMap3DProps) {
  const [zonePanelOpen, setZonePanelOpen] = useState(true)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [internalView, setInternalView] = useState<StoveView>('solid')
  const [internalCamera, setInternalCamera] = useState<CameraPreset>('iso')
  const [internalOpenings, setInternalOpenings] = useState<OpeningState>(DEFAULT_OPENINGS)
  const [internalLabelMode, setInternalLabelMode] = useState<LabelMode>('none')
  const [cutDepth, setCutDepth] = useState(DEFAULT_CUT_DEPTH)
  const [explodeAmount, setExplodeAmount] = useState(DEFAULT_EXPLODE_AMOUNT)
  const [recenterToken, setRecenterToken] = useState(0)
  const [cameraFollowsPart, setCameraFollowsPart] = useState(false)
  // Com o painel sobreposto o canvas vai do topo dele até o pé da janela:
  // mede onde o mapa começa e usa o resto da altura da tela.
  const mapRef = useRef<HTMLDivElement>(null)
  const [fillHeight, setFillHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (!overlayZoneList) return
    const measure = () => {
      const el = mapRef.current
      if (!el || window.innerWidth < 900) return setFillHeight(null)
      const top = el.getBoundingClientRect().top + window.scrollY
      // Vai até o pé da janela: o card sangra sobre o recuo de baixo (ver `style`).
      setFillHeight(Math.max(460, window.innerHeight - top))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [overlayZoneList])
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

  // Clique numa variável de "Configuração selecionada": vai até a peça. Só
  // reage a um token novo; o reenquadramento vale mesmo se o preset já for o atual.
  const handledFocusToken = useRef<number | null>(null)
  useEffect(() => {
    if (!focusRequest || handledFocusToken.current === focusRequest.token) return
    handledFocusToken.current = focusRequest.token
    const target = cameraForPart(focusRequest.part)
    if (!cameraPreset) setInternalCamera(target.preset)
    if (target.openings) {
      setInternalOpenings((prev) => ({ ...(openings ?? prev), ...target.openings }))
      onOpeningsChange?.({ ...effectiveOpenings, ...target.openings })
    }
    setRecenterToken((n) => n + 1)
  }, [focusRequest, cameraPreset, openings, onOpeningsChange, effectiveOpenings])

  // Ligar/desligar a vista explodida muda a altura do fogão: reenquadra uma
  // vez no toggle (o slider em si não reenquadra — ver `CameraRig`).
  const explodeOn = effectiveOpenings.explode
  const previousExplode = useRef(explodeOn)
  useEffect(() => {
    if (previousExplode.current !== explodeOn) {
      previousExplode.current = explodeOn
      setRecenterToken((n) => n + 1)
    }
  }, [explodeOn])

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

  /**
   * Algoritmo por área, sempre derivado das predições recebidas: uma zona fora
   * do recorte não tem procedência porque não tem dado.
   */
  const algorithmByArea = useMemo(() => {
    const map = new Map<string, AlgorithmCode>()
    for (const p of predictions) map.set(p.key_area, p.algorithm)
    return map
  }, [predictions])

  function tooltipFor(zoneKey: string) {
    const agg = aggByKey.get(zoneKey)
    if (!agg) return null
    return (
      <TooltipCard agg={agg} value={valueFor(agg)} algorithm={algorithmByArea.get(zoneKey)} />
    )
  }

  const toolbar = (
    <MapToolbar
      openings={effectiveOpenings}
      onToggleOpening={handleToggleOpening}
      labelMode={effectiveLabelMode}
      onLabelModeChange={handleLabelModeChange}
      view={effectiveView}
      onViewChange={handleViewChange}
      cutDepth={cutDepth}
      onCutDepthChange={setCutDepth}
      explodeAmount={explodeAmount}
      onExplodeAmountChange={setExplodeAmount}
      cameraPreset={effectiveCamera}
      onCameraPresetChange={setInternalCamera}
      onRecenter={() => setRecenterToken((n) => n + 1)}
      cameraFollowsPart={cameraFollowsPart}
      onCameraFollowsPartChange={setCameraFollowsPart}
      variant={toolbarContainer ? 'panel' : 'overlay'}
    />
  )

  const zoneList = (
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
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className={cn(
          'grid gap-4',
          !overlayZoneList && 'min-[900px]:grid-cols-[1fr_280px]',
        )}
      >
        <Card
          ref={mapRef}
          // Sangra sobre o recuo da coluna (esquerda, deixando uma fresta da barra de navegação,
          // direita e base) para o canvas ocupar toda a área branca.
          style={
            fillHeight
              ? { height: fillHeight, marginLeft: -32, marginRight: -20, marginBottom: -32 }
              : undefined
          }
          className={cn(
            'relative min-h-[460px] overflow-hidden bg-wp-gray05',
            overlayZoneList ? (fillHeight ? '' : 'aspect-[4/3]') : 'aspect-[4/3]',
            overlayZoneList && 'border-0 shadow-none',
          )}
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
                explodeAmount={explodeAmount}
                config={effectiveConfig}
                openings={effectiveOpenings}
                highlightPart={highlightPart}
                onHoverPart={() => {}}
                autoRotate={false}
                reducedMotion={prefersReducedMotion}
                cameraPreset={effectiveCamera}
                recenterToken={recenterToken}
                zoneLabels={zoneLabels}
                showAnnotations={effectiveLabelMode !== 'none'}
                selectedKeyArea={selectedKeyArea}
                sensorPins={sensorPins}
                onSelectSensor={onSelectSensor}
                tightFraming={overlayZoneList}
              />
            </Canvas>
          </div>

          {!toolbarContainer && toolbar}

          {/* Coluna direita sobre o canvas: painel de áreas no topo (rola por
              dentro) e legenda no rodapé. O vazio entre eles deixa os eventos
              passarem para o canvas. */}
          <div
            className={cn(
              'pointer-events-none absolute bottom-14 right-3 top-3 z-10 flex flex-col items-end gap-2',
              overlayZoneList && 'min-[900px]:w-[19rem]',
            )}
          >
            {overlayZoneList && (
              <section
                aria-label="Áreas do mapa"
                className="pointer-events-auto hidden min-h-0 w-full flex-col gap-2 rounded-md border border-wp-gray12 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur min-[900px]:flex"
              >
                <CollapseToggle label="Áreas" expanded={zonePanelOpen} onClick={() => setZonePanelOpen(!zonePanelOpen)} />
                {zonePanelOpen && (
                  <>
                    {zonePanelControls}
                    <div className="-mx-1 min-h-0 overflow-y-auto px-1 [scrollbar-width:thin]">{zoneList}</div>
                  </>
                )}
              </section>
            )}
          </div>

          <LegendOverlay
            model={legend}
            className="absolute bottom-3 left-3 z-10 w-fit max-w-[calc(100%-1.5rem)] rounded-md bg-white backdrop-blur"
          />
        </Card>

        {overlayZoneList ? (
          // Telas estreitas: o painel sobreposto cobriria o fogão, então a
          // lista volta para baixo do mapa.
          <div className="flex flex-col gap-2 min-[900px]:hidden">
            {zonePanelControls}
            {zoneList}
          </div>
        ) : (
          <div className="flex flex-col gap-2">{zoneList}</div>
        )}
      </div>

      {/* Com o painel sobreposto o aviso já está no rodapé da página. */}
      {toolbarContainer && createPortal(toolbar, toolbarContainer)}

      {!overlayZoneList && <p className="tabular text-xs text-wp-gray45">Geometria ilustrativa — não é CAD</p>}
    </div>
  )
}
