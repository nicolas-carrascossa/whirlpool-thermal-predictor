/**
 * Faixa de áreas: seletor de qual área aparece no detalhe logo abaixo.
 *
 * A previsão é feita para todas as áreas de uma vez; aqui só se escolhe qual
 * ler. Sempre há exatamente uma área escolhida. O ponto de status e a pior
 * razão vêm da resposta atual, então a faixa também serve de índice: dá para
 * ver qual área está no limite sem abrir nenhuma.
 */

import { useState } from 'react'

import { AreaThumb } from '@/features/config/AreaThumb'
import type { AreaGroup } from '@/features/results/AreaCard'
import { STATUS_COLOR, byLimitRatioDesc, statusOf, type SensorStatus } from '@/lib/status'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<SensorStatus, string> = {
  ok: 'Dentro do limite',
  warn: 'Atenção',
  danger: 'Excede o limite',
  monitor: 'Monitoramento',
}

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

function AreaTile({
  name,
  label,
  group,
  selected,
  onSelect,
}: {
  name: string
  label: string
  /** Resultado da área na resposta atual; ausente se a resposta não a cobre. */
  group: AreaGroup | undefined
  selected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const status = group ? areaStatus(group) : null
  const pct = group ? withinLimitPct(group) : null

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
        <AreaThumb area={name} size={64} active={(hovered || focused || selected) && !!group} />
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
  return (
    <section aria-label="Áreas" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">Áreas</h2>
        <p className="text-xs text-wp-gray65">Escolha qual ver. A previsão roda em todas.</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] overflow-hidden rounded-md border border-wp-gray12">
        {areas.map((area) => (
          <AreaTile
            key={area.name}
            name={area.name}
            label={area.label_pt}
            group={byName.get(area.name)}
            selected={selected === area.name}
            onSelect={() => onSelect(area.name)}
          />
        ))}
      </ul>
    </section>
  )
}
