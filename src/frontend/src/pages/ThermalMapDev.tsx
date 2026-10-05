import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

import type { Metadata, PredictionResponse, StoveConfig } from '@/contract/v1'
import { VARIABLE_TO_PART, type PartId } from '@/components/thermal-map/parts'
import type { MapColorMode } from '@/components/thermal-map/ThermalMap3D'
import { DEFAULT_OPENINGS, type OpeningState } from '@/components/thermal-map/StoveContext'
import { LABEL_MODE_LABEL_PT, type LabelMode } from '@/components/thermal-map/zoneStatus'
import { ovenBadgeText } from '@/components/thermal-map/ovenBadge'
import { getPredictionSource } from '@/sources'

const ThermalMap3D = lazy(() =>
  import('@/components/thermal-map/ThermalMap3D').then((m) => ({ default: m.ThermalMap3D })),
)

/** Medidor de FPS só desta página de dev (critério da Fase 1c: ≥ 50 fps). */
function FpsMeter() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const tick = () => {
      frames += 1
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <span className="tabular rounded border border-wp-gray20 px-2 py-1 text-xs text-wp-gray65">
      {fps} fps
    </span>
  )
}

/**
 * Página interna (Fases 1b/1c) só para desenvolvimento/verificação do
 * `<ThermalMap3D>` fora do fluxo de configuração/resultados: as 7 variáveis
 * alimentam o `config` das peças 3D em tempo real. Não faz parte da navegação.
 */
export function ThermalMapDevPage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [current, setCurrent] = useState<PredictionResponse | null>(null)
  // Parte vazio: a configuração inicial é a `reference_config` que o modelo
  // devolve em `metadata`, nunca uma constante embutida no cliente.
  const [config, setConfig] = useState<StoveConfig | null>(null)
  const [mode, setMode] = useState<MapColorMode>('status')
  const [openings, setOpenings] = useState<OpeningState>(DEFAULT_OPENINGS)
  const [labelMode, setLabelMode] = useState<LabelMode>('alerts')
  const [selectedSensor, setSelectedSensor] = useState<number | null>(null)
  const [selectedKeyArea, setSelectedKeyArea] = useState<string | null>(null)
  const [onlyIpcAndVent, setOnlyIpcAndVent] = useState(false)
  const [highlightPart, setHighlightPart] = useState<PartId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const source = getPredictionSource()
    source
      .getMetadata()
      .then((meta) => {
        if (cancelled) return
        setMetadata(meta)
        setConfig((prev) => prev ?? { ...meta.reference_config })
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!config) return
    let cancelled = false
    getPredictionSource()
      .predict({ architecture: 'BR', config })
      .then((res) => {
        if (!cancelled) setCurrent(res)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [config])

  useEffect(() => () => (highlightTimer.current ? clearTimeout(highlightTimer.current) : undefined), [])

  function updateVariable(name: keyof StoveConfig, value: string) {
    setConfig((prev) => (prev ? { ...prev, [name]: value } : prev))
    const part = VARIABLE_TO_PART[name]
    setHighlightPart(part)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    if (part) highlightTimer.current = setTimeout(() => setHighlightPart(null), 1100)
  }

  const keyAreaLabels = useMemo(() => {
    if (!metadata) return {}
    return Object.fromEntries(metadata.key_areas.map((a) => [a.name, a.label_pt]))
  }, [metadata])

  const filterAreas = ['IPC Comp', 'Main Vent Sys']

  const currentPredictions = useMemo(() => {
    if (!current) return []
    if (!onlyIpcAndVent) return current.predictions
    return current.predictions.filter((p) => filterAreas.includes(p.key_area))
  }, [current, onlyIpcAndVent])

  if (error) {
    return (
      <main className="p-8">
        <p role="alert" className="text-status-danger-ink">
          Falha ao carregar: {error}
        </p>
      </main>
    )
  }

  if (!metadata || !current || !config) {
    return (
      <main className="p-8">
        <p>Carregando…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.05em] text-wp-accent">
          Dev · não faz parte do produto
        </p>
        <h1 className="font-display text-3xl font-light text-wp-core">Mapa térmico 3D</h1>
      </div>

      <div className="grid gap-3 rounded-md border border-wp-gray12 bg-wp-gray05 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {metadata.variables.map((variable) => (
          <label key={variable.name} className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-wp-gray85">
              {variable.label_pt}
              {VARIABLE_TO_PART[variable.name as keyof StoveConfig] === null && (
                <span className="ml-1 font-normal text-wp-gray45">(sem peça)</span>
              )}
            </span>
            <select
              className="rounded border border-wp-gray20 bg-white px-2 py-1 text-wp-gray85"
              value={config[variable.name as keyof StoveConfig]}
              onChange={(e) => updateVariable(variable.name as keyof StoveConfig, e.target.value)}
            >
              {variable.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-wp-gray12 bg-wp-gray05 p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-wp-gray85">Modo</span>
          {(
            [
              ['status', 'Status (limite)'],
              ['absolute', 'Mapa de calor'],
            ] as [MapColorMode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded px-2 py-1 ${mode === id ? 'bg-wp-core text-white' : 'border border-wp-gray20 text-wp-gray85'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-wp-gray85">Aberturas</span>
          {(
            [
              ['console', 'Levantar cooktop'],
              ['rear', 'Abrir traseira'],
              ['oven', 'Abrir forno'],
              ['explode', 'Vista explodida'],
            ] as [keyof OpeningState, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={openings[id]}
              onClick={() => setOpenings((prev) => ({ ...prev, [id]: !prev[id] }))}
              className={`rounded px-2 py-1 ${openings[id] ? 'bg-wp-core text-white' : 'border border-wp-gray20 text-wp-gray85'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-wp-gray85">Rótulos</span>
          {(['alerts', 'all', 'none'] as LabelMode[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={labelMode === id}
              onClick={() => setLabelMode(id)}
              className={`rounded px-2 py-1 ${labelMode === id ? 'bg-wp-core text-white' : 'border border-wp-gray20 text-wp-gray85'}`}
            >
              {LABEL_MODE_LABEL_PT[id]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyIpcAndVent}
            onChange={(e) => setOnlyIpcAndVent(e.target.checked)}
          />
          somente IPC Comp e Main Vent Sys
        </label>

        <button
          type="button"
          onClick={() => setConfig({ ...metadata.reference_config })}
          className="rounded border border-wp-gray20 px-2 py-1 text-wp-gray85"
        >
          Configuração de referência
        </button>

        <FpsMeter />

        <p className="tabular text-wp-gray65">
          Área selecionada: <b>{selectedKeyArea ? (keyAreaLabels[selectedKeyArea] ?? selectedKeyArea) : 'nenhuma'}</b>
        </p>

        <p className="tabular text-wp-gray65" data-testid="selected-sensor">
          Sensor clicado:{' '}
          <b>
            {selectedSensor === null
              ? 'nenhum'
              : (currentPredictions.find((p) => p.tc_number === selectedSensor)?.tc_name ??
                `TC ${selectedSensor}`)}
          </b>
        </p>

        <p className="tabular text-wp-gray65">
          Selo do forno: <b>{ovenBadgeText(config)}</b>
        </p>
      </div>

      <p className="max-w-2xl text-xs text-wp-gray65">
        Os seletores acima alimentam a prop <code className="tabular">config</code> do mapa: cada variável
        geométrica move uma peça do 3D (a peça alterada pulsa ~1 s e ganha um rótulo temporário). As
        aberturas, o seletor de rótulos, os presets de câmera (com fit-to-view) e o "Avançado" com vista e
        profundidade de corte ficam na barra sobre o canvas. Clicar num pino de sensor chama
        <code className="tabular"> onSelectSensor</code> — o resultado aparece em "Sensor clicado".
      </p>

      <Suspense fallback={<p>Carregando mapa…</p>}>
        <ThermalMap3D
          predictions={currentPredictions}
          mode={mode}
          keyAreaLabels={keyAreaLabels}
          selectedKeyArea={selectedKeyArea}
          onSelectKeyArea={setSelectedKeyArea}
          onSelectSensor={setSelectedSensor}
          config={config}
          openings={openings}
          onOpeningsChange={setOpenings}
          labelMode={labelMode}
          onLabelModeChange={setLabelMode}
          highlightPart={highlightPart}
        />
      </Suspense>
    </main>
  )
}
