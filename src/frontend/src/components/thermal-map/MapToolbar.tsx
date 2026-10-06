import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { CollapseToggle } from './CollapseToggle'
import type { OpeningState, StoveView } from './StoveContext'
import type { CameraPreset } from './ThermalMapScene'
import { LABEL_MODE_LABEL_PT, type LabelMode } from './zoneStatus'

const VIEW_LABELS: { id: StoveView; label: string; title: string }[] = [
  { id: 'solid', label: 'Sólido', title: 'Corpo opaco; o interior só aparece pelo vidro da porta' },
  { id: 'cutaway', label: 'Corte', title: 'Plano de corte revela a baía da eletrônica e a cavidade' },
  { id: 'xray', label: 'Raio-X', title: 'Carcaça translúcida; zonas e peças opacas' },
]

const CAMERA_LABELS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Frente' },
  { id: 'back', label: 'Traseira' },
  { id: 'console', label: 'Console' },
  { id: 'iso', label: 'Isométrica' },
]

/** Aberturas semânticas: o controle principal do que se vê por dentro. */
const OPENING_LABELS: { id: keyof OpeningState; label: string; title: string }[] = [
  {
    // a chave continua `console` (estado); o gesto agora levanta o cooktop
    id: 'console',
    label: 'Levantar cooktop',
    title: 'Levanta o cooktop (vidro, elementos e bandeja): mostra a baía da eletrônica — carcaça, blower, defletor e placa',
  },
  { id: 'rear', label: 'Abrir traseira', title: 'Afasta o painel traseiro: fundo da baía' },
  { id: 'oven', label: 'Abrir forno', title: 'Abaixa a porta: resistência e suporte da resistência' },
  {
    id: 'explode',
    label: 'Vista explodida',
    title: 'Afasta as camadas em altura — vidro, elementos, bandeja e baía da eletrônica; o quanto, pelo controle abaixo',
  },
]

const LABEL_MODES: LabelMode[] = ['alerts', 'all', 'none']

interface MapToolbarProps {
  openings: OpeningState
  onToggleOpening: (kind: keyof OpeningState) => void
  labelMode: LabelMode
  onLabelModeChange: (mode: LabelMode) => void
  view: StoveView
  onViewChange: (view: StoveView) => void
  cutDepth: number
  onCutDepthChange: (depth: number) => void
  /** Afastamento das camadas na vista explodida, 0–100 %. */
  explodeAmount: number
  onExplodeAmountChange: (amount: number) => void
  cameraPreset: CameraPreset
  onCameraPresetChange: (preset: CameraPreset) => void
  /** "Recentralizar": o fogão volta à posição inicial e todos os rótulos somem (como um reinício). */
  onRecenter: () => void
  /** "Câmera segue a peça alterada" (Fase 1d, etapa E) — padrão OFF. */
  cameraFollowsPart?: boolean
  onCameraFollowsPartChange?: (value: boolean) => void
  /**
   * `overlay` (padrão): cartão recolhível sobre o canto do canvas.
   * `panel`: seção sempre aberta, com título, para a barra lateral direita.
   */
  variant?: 'overlay' | 'panel'
}

const chip =
  'rounded px-2 py-1 font-body text-xs leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Controles de abertura, rótulos, câmera e (em "Avançado") vista e corte. */
export function MapToolbar({
  openings,
  onToggleOpening,
  labelMode,
  onLabelModeChange,
  view,
  onViewChange,
  cutDepth,
  onCutDepthChange,
  explodeAmount,
  onExplodeAmountChange,
  cameraPreset,
  onCameraPresetChange,
  onRecenter,
  cameraFollowsPart = false,
  onCameraFollowsPartChange,
  variant = 'overlay',
}: MapToolbarProps) {
  // Sobre o canvas começa compacto para não encobrir o modelo 3D; na barra
  // lateral há espaço, então fica sempre aberto.
  const [overlayExpanded, setExpanded] = useState(false)
  const isPanel = variant === 'panel'
  const expanded = isPanel || overlayExpanded

  return (
    <div
      className={cn(
        isPanel
          ? 'flex flex-col gap-2'
          : 'absolute left-3 top-3 z-10 flex flex-col gap-2 rounded-md border border-wp-gray12 bg-white/90 p-2 shadow-sm backdrop-blur',
        !isPanel && expanded && 'w-[min(100%-1.5rem,17rem)]',
      )}
    >
      {isPanel ? (
        <>
          {/* Fica entre "Configuração selecionada" e os filtros: age sobre o mapa inteiro. */}
          <Button
            type="button"
            size="sm"
            className="w-full"
            title="Volta o fogão à posição inicial e remove todos os rótulos"
            onClick={onRecenter}
          >
            <RotateCcw aria-hidden="true" /> Recentralizar
          </Button>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">Filtros do mapa</h2>
        </>
      ) : (
        <CollapseToggle label="Filtros" expanded={expanded} onClick={() => setExpanded(!expanded)} />
      )}
      {expanded && (
        <>
          <div role="group" aria-label="Aberturas do fogão" className="flex flex-wrap gap-1">
            {OPENING_LABELS.map((o) => (
              <button
                key={o.id}
                type="button"
                title={o.title}
                aria-pressed={openings[o.id]}
                onClick={() => onToggleOpening(o.id)}
                className={cn(
                  chip,
                  'border',
                  openings[o.id]
                    ? 'border-wp-core bg-wp-core text-white'
                    : 'border-wp-gray20 text-wp-gray85 hover:bg-wp-accentLt',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {openings.explode && (
            <label className="flex items-center gap-2 font-body text-xs text-wp-gray65">
              <span className="whitespace-nowrap">Afastamento</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={explodeAmount}
                onChange={(e) => onExplodeAmountChange(Number(e.target.value))}
                className="h-1 flex-1 accent-wp-accent"
                aria-label="Afastamento das camadas na vista explodida, em porcento"
              />
              <span className="tabular w-8 text-right text-wp-gray85">{explodeAmount}%</span>
            </label>
          )}

          <div className="flex items-center gap-1" role="group" aria-label="Rótulos das zonas">
            <span className="font-body text-xs text-wp-gray85">Rótulos</span>
            {LABEL_MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={labelMode === m}
                onClick={() => onLabelModeChange(m)}
                className={cn(
                  chip,
                  'border',
                  labelMode === m
                    ? 'border-wp-accent bg-wp-accentLt text-wp-core'
                    : 'border-wp-gray20 text-wp-gray65 hover:bg-wp-gray05',
                )}
              >
                {LABEL_MODE_LABEL_PT[m]}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Câmera" className="flex flex-wrap gap-1">
            {CAMERA_LABELS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={cameraPreset === c.id}
                onClick={() => onCameraPresetChange(c.id)}
                className={cn(
                  chip,
                  'border',
                  cameraPreset === c.id
                    ? 'border-wp-accent bg-wp-accentLt text-wp-core'
                    : 'border-wp-gray20 text-wp-gray65 hover:bg-wp-gray05',
                )}
              >
                {c.label}
              </button>
            ))}
            {!isPanel && (
              <button
                type="button"
                onClick={onRecenter}
                className={cn(chip, 'border border-wp-gray20 text-wp-gray65 hover:bg-wp-gray05')}
              >
                Recentralizar
              </button>
            )}
          </div>

          <div>
            <p className="font-body text-[11px] font-semibold text-wp-gray85">Avançado</p>
            <div className="mt-2 flex flex-col gap-2">
              <div role="group" aria-label="Modo de visualização" className="flex gap-1">
                {VIEW_LABELS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    title={v.title}
                    aria-pressed={view === v.id}
                    onClick={() => onViewChange(v.id)}
                    className={cn(
                      chip,
                      'flex-1 border',
                      view === v.id
                        ? 'border-wp-core bg-wp-core text-white'
                        : 'border-wp-gray20 text-wp-gray85 hover:bg-wp-accentLt',
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {onCameraFollowsPartChange && (
                <label className="flex items-center gap-2 font-body text-xs text-wp-gray65">
                  <input
                    type="checkbox"
                    checked={cameraFollowsPart}
                    onChange={(e) => onCameraFollowsPartChange(e.target.checked)}
                    className="accent-wp-accent"
                  />
                  Câmera segue a peça alterada
                </label>
              )}

              {view === 'cutaway' && (
                <label className="flex items-center gap-2 font-body text-xs text-wp-gray65">
                  <span className="whitespace-nowrap">Corte</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={cutDepth}
                    onChange={(e) => onCutDepthChange(Number(e.target.value))}
                    className="h-1 flex-1 accent-wp-accent"
                    aria-label="Profundidade do corte, em porcento"
                  />
                  <span className="tabular w-8 text-right text-wp-gray85">{cutDepth}%</span>
                </label>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
