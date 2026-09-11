import type { ZoneAggregate } from './aggregate'
import type { MapColorMode } from './ThermalMap3D'
import { ZONE_STATUS_LABEL_PT, type ZoneStatus } from './zoneStatus'

interface ZoneListPanelProps {
  aggregates: ZoneAggregate[]
  mode: MapColorMode
  hoveredKey: string | null
  selectedKeyArea?: string | null
  onHover: (key: string | null) => void
  onSelect: (key: string) => void
  colorFor: (agg: ZoneAggregate) => string
  /** Mesma medida mostrada no rótulo dentro da cena, conforme o modo. */
  valueFor: (agg: ZoneAggregate) => string
  statusFor: (zoneKey: string) => ZoneStatus
}

const STATUS_RANK: Record<ZoneStatus, number> = { danger: 3, warn: 2, ok: 1, none: 0 }

function sortAggregates(
  aggregates: ZoneAggregate[],
  mode: MapColorMode,
  statusFor: (key: string) => ZoneStatus,
): ZoneAggregate[] {
  return [...aggregates].sort((a, b) => {
    if (a.hasSensors !== b.hasSensors) return a.hasSensors ? -1 : 1
    if (mode === 'delta') return Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0)
    if (mode === 'status') {
      const diff = STATUS_RANK[statusFor(b.key)] - STATUS_RANK[statusFor(a.key)]
      if (diff !== 0) return diff
    }
    return (b.mean ?? 0) - (a.mean ?? 0)
  })
}

export function ZoneListPanel({
  aggregates,
  mode,
  hoveredKey,
  selectedKeyArea,
  onHover,
  onSelect,
  colorFor,
  valueFor,
  statusFor,
}: ZoneListPanelProps) {
  const sorted = sortAggregates(aggregates, mode, statusFor)

  return (
    <ul className="flex flex-col gap-1" aria-label="Áreas do fogão e temperatura prevista">
      {sorted.map((agg) => {
        const isActive = hoveredKey === agg.key || selectedKeyArea === agg.key
        return (
          <li
            key={agg.key}
            role="button"
            tabIndex={0}
            aria-pressed={selectedKeyArea === agg.key}
            onMouseEnter={() => onHover(agg.key)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(agg.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(agg.key)
              }
            }}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-wp-accent ${
              isActive ? 'border-wp-accent bg-wp-accentLt' : 'border-transparent hover:bg-wp-gray05'
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-wp-gray20"
              style={{ background: colorFor(agg) }}
              aria-hidden="true"
              title={mode === 'status' ? ZONE_STATUS_LABEL_PT[statusFor(agg.key)] : undefined}
            />
            <span className="min-w-0 flex-1 truncate font-body text-wp-gray85">{agg.label}</span>
            <span className="tabular shrink-0 text-right text-xs text-wp-gray65">
              {agg.hasSensors ? (
                valueFor(agg)
              ) : (
                <span className="text-wp-gray45">sem sensores selecionados</span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
