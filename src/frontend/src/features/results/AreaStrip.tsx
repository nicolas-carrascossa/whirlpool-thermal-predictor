/**
 * Faixa de áreas: seletor de qual área aparece no detalhe logo abaixo.
 *
 * A previsão é feita para todas as áreas de uma vez; aqui só se escolhe qual
 * ler. Sempre há exatamente uma área escolhida. O ponto de status e a pior
 * razão vêm da resposta atual, então a faixa também serve de índice: dá para
 * ver qual área está no limite sem abrir nenhuma.
 *
 * A figura de cada cartão é a peça do fogão 3D que representa a área, desenhada
 * com os mesmos componentes do mapa térmico (`AreaFigures`), numa coloração
 * fixa: o status da área é dito pelo ponto e pela porcentagem do cartão, não
 * pela cor da figura. Todas saem de um único canvas WebGL por cima da faixa, que
 * carrega sob demanda; cada cartão só reserva o quadrado onde a sua figura
 * aparece. Sem WebGL (ou se ele falhar), os cartões voltam ao desenho de reserva
 * em CSS (`AreaThumb`).
 */

import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { FigurePlacement } from '@/components/thermal-map/AreaFiguresCanvas'
import { usePrefersReducedMotion } from '@/components/thermal-map/usePrefersReducedMotion'
import { AreaThumb } from '@/features/config/AreaThumb'
import type { AreaGroup } from '@/features/results/AreaCard'
import { webglAvailable } from '@/lib/webgl'
import { STATUS_COLOR, byLimitRatioDesc, statusOf, type SensorStatus } from '@/lib/status'
import { cn } from '@/lib/utils'

// `three` e `@react-three/*` só descem quando a faixa aparece com WebGL disponível.
const AreaFiguresCanvas = lazy(() => import('@/components/thermal-map/AreaFiguresCanvas'))

const STATUS_LABEL: Record<SensorStatus, string> = {
  ok: 'Dentro do limite',
  warn: 'Atenção',
  danger: 'Excede o limite',
  monitor: 'Monitoramento',
}

/** Lado do quadrado reservado para a figura de cada cartão, em px. */
const FIGURE_SIZE = 64

/**
 * Percentual de sensores com limite normativo que NÃO excedem o limite.
 * Sensores só de monitoramento ficam fora da conta; `null` se a área não tem nenhum com limite.
 */
export function withinLimitPct(group: AreaGroup): number | null {
  const limited = group.predictions.filter((p) => statusOf(p) !== 'monitor')
  if (limited.length === 0) return null
  const within = limited.filter((p) => statusOf(p) !== 'danger').length
  return Math.round((within / limited.length) * 100)
}

function areaStatus(group: AreaGroup): SensorStatus {
  const worst = [...group.predictions].sort(byLimitRatioDesc)[0]
  return worst ? statusOf(worst) : 'monitor'
}

/** Se o canvas das figuras falhar (contexto WebGL negado, por exemplo), avisa e some. */
class FiguresBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function AreaTile({
  name,
  label,
  group,
  selected,
  onSelect,
  figure,
}: {
  name: string
  label: string
  /** Resultado da área na resposta atual; ausente se a resposta não a cobre. */
  group: AreaGroup | undefined
  selected: boolean
  onSelect: () => void
  /**
   * Figura 3D: o cartão reserva o quadrado (`slotRef`) e avisa quando passa a
   * estar em destaque. Ausente = desenho de reserva em CSS.
   */
  figure?: { slotRef: (el: HTMLElement | null) => void; onActiveChange: (active: boolean) => void }
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const status = group ? areaStatus(group) : null
  const pct = group ? withinLimitPct(group) : null
  const thumbActive = (hovered || focused || selected) && !!group

  const reportActive = figure?.onActiveChange
  useEffect(() => {
    reportActive?.(thumbActive)
  }, [reportActive, thumbActive])

  return (
    <li className="border-l border-wp-gray12 first:border-l-0">
      <button
        type="button"
        disabled={!group}
        aria-pressed={selected}
        aria-label={`Ver resultados: ${label}`}
        title={group ? label : `${label} — sem resultado nesta consulta`}
        onClick={onSelect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          // Célula plana: a divisão entre áreas é uma linha, não um cartão.
          'flex h-full w-full flex-col items-center gap-1 px-2 pb-3 pt-3 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          selected ? 'bg-wp-accentLt shadow-[inset_0_-3px_0_var(--wp-core)]' : 'hover:bg-wp-gray05',
          group ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
        )}
      >
        {figure ? (
          // O quadrado em si não leva transform (é medido para posicionar a figura);
          // só a sombra de chão, dentro dele, cresce com o destaque.
          <span
            ref={figure.slotRef}
            aria-hidden="true"
            data-area-figure-slot={name}
            className="relative inline-block shrink-0"
            style={{ width: FIGURE_SIZE, height: FIGURE_SIZE }}
          >
            <span
              className="absolute bottom-[20%] left-1/2 h-[6px] -translate-x-1/2 rounded-full bg-black/25 blur-[3px] transition-transform duration-200 ease-out"
              style={{ width: FIGURE_SIZE * 0.62, transform: `translateX(-50%) scale(${thumbActive ? 1.22 : 1})` }}
            />
          </span>
        ) : (
          <AreaThumb area={name} size={FIGURE_SIZE} active={thumbActive} />
        )}
        <span className="line-clamp-2 min-h-[2rem] font-body text-xs font-semibold leading-tight text-wp-core">
          {label}
        </span>
        <span className="flex flex-col items-center leading-tight">
          <span className="flex items-center gap-1.5 text-sm font-bold text-wp-gray85">
            <span
              aria-hidden="true"
              className={cn('h-2.5 w-2.5 shrink-0 rounded-full', !status && 'border border-dashed border-wp-gray45')}
              style={status ? { backgroundColor: STATUS_COLOR[status] } : undefined}
            />
            <span className="tabular">{status ? (pct !== null ? `${pct} %` : 'monitor') : '—'}</span>
          </span>
          <span className="text-[10px] text-wp-gray65">
            {status ? (pct !== null ? 'dentro do limite' : 'sem limite') : 'sem resultado'}
          </span>
          {status && <span className="sr-only">{STATUS_LABEL[status]}</span>}
        </span>
      </button>
    </li>
  )
}

type Layout = Record<string, { cx: number; cy: number; size: number; tileWidth: number }>

function sameLayout(a: Layout, b: Layout): boolean {
  const keys = Object.keys(b)
  if (keys.length !== Object.keys(a).length) return false
  return keys.every((k) => {
    const x = a[k]
    const y = b[k]
    return (
      !!x &&
      Math.abs(x.cx - y.cx) < 0.5 &&
      Math.abs(x.cy - y.cy) < 0.5 &&
      Math.abs(x.size - y.size) < 0.5 &&
      Math.abs(x.tileWidth - y.tileWidth) < 0.5
    )
  })
}

export function AreaStrip({
  areas,
  groups,
  selected,
  onSelect,
}: {
  /** Todas as áreas do metadata, na ordem fixa (a faixa não reordena por criticidade). */
  areas: { name: string; label_pt: string }[]
  groups: AreaGroup[]
  /** `key_area` em exibição. */
  selected: string | null
  onSelect: (area: string) => void
}) {
  const byName = new Map(groups.map((g) => [g.name, g]))
  const reducedMotion = usePrefersReducedMotion()
  const [canvasFailed, setCanvasFailed] = useState(false)
  const use3d = useMemo(webglAvailable, []) && !canvasFailed

  const wrapRef = useRef<HTMLDivElement>(null)
  const slots = useRef(new Map<string, HTMLElement>())
  const [layout, setLayout] = useState<Layout>({})
  const [activeAreas, setActiveAreas] = useState<ReadonlySet<string>>(new Set())

  // Onde cada quadrado reservado está, em px a partir do canto da faixa.
  const measure = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const origin = wrap.getBoundingClientRect()
    const next: Layout = {}
    for (const [name, el] of slots.current) {
      const r = el.getBoundingClientRect()
      const tile = el.closest('li')?.getBoundingClientRect().width ?? r.width * 1.75
      next[name] = {
        cx: r.left - origin.left + r.width / 2,
        cy: r.top - origin.top + r.height / 2,
        size: r.width,
        tileWidth: tile,
      }
    }
    setLayout((prev) => (sameLayout(prev, next) ? prev : next))
  }, [])

  useLayoutEffect(() => {
    if (!use3d) return
    measure()
    const wrap = wrapRef.current
    const observer = typeof ResizeObserver === 'undefined' || !wrap ? null : new ResizeObserver(measure)
    if (wrap) observer?.observe(wrap)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [use3d, measure, areas])

  const slotRefFor = useCallback(
    (name: string) => (el: HTMLElement | null) => {
      if (el) slots.current.set(name, el)
      else slots.current.delete(name)
    },
    [],
  )
  const activeChangeFor = useCallback(
    (name: string) => (active: boolean) =>
      setActiveAreas((prev) => {
        if (prev.has(name) === active) return prev
        const next = new Set(prev)
        if (active) next.add(name)
        else next.delete(name)
        return next
      }),
    [],
  )

  const figureCallbacks = useMemo(
    () => new Map(areas.map((a) => [a.name, { slotRef: slotRefFor(a.name), onActiveChange: activeChangeFor(a.name) }])),
    [areas, slotRefFor, activeChangeFor],
  )

  const placements: FigurePlacement[] = areas.flatMap((area) => {
    const spot = layout[area.name]
    if (!spot) return []
    const group = byName.get(area.name)
    return [
      {
        area: area.name,
        active: !!group && activeAreas.has(area.name),
        ...spot,
      },
    ]
  })

  return (
    <section aria-label="Áreas" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">Áreas</h2>
        <p className="text-xs text-wp-gray65">Escolha qual ver. A previsão roda em todas.</p>
      </div>
      <div ref={wrapRef} className="relative">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] overflow-hidden rounded-md border border-wp-gray12">
          {areas.map((area) => (
            <AreaTile
              key={area.name}
              name={area.name}
              label={area.label_pt}
              group={byName.get(area.name)}
              selected={selected === area.name}
              onSelect={() => onSelect(area.name)}
              figure={use3d ? figureCallbacks.get(area.name) : undefined}
            />
          ))}
        </ul>
        {use3d && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <FiguresBoundary onError={() => setCanvasFailed(true)}>
              <Suspense fallback={null}>
                <AreaFiguresCanvas placements={placements} reducedMotion={reducedMotion} />
              </Suspense>
            </FiguresBoundary>
          </div>
        )}
      </div>
    </section>
  )
}
