/**
 * Matriz de decisão 2×2. Linhas: o que o modelo decidiu; colunas: o que a
 * medição mostrou. "Positivo" é aprovar, então FP (aprovou algo que excede) é a
 * célula que importa e ganha destaque por cor E por texto.
 */

import { formatCount, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

import { actualExceedances, type ConfusionCounts } from './metricsModel'

interface Cell {
  key: keyof ConfusionCounts
  abbr: string
  title: string
  className: string
}

const CELLS: Cell[] = [
  { key: 'tp', abbr: 'TP', title: 'Aprovou e estava dentro do limite', className: 'bg-green-50 text-status-ok-ink' },
  { key: 'fp', abbr: 'FP', title: 'Aprovou, mas excede o limite', className: 'bg-red-50 text-status-danger-ink' },
  { key: 'fn', abbr: 'FN', title: 'Reprovou, mas estava dentro do limite', className: 'bg-orange-50 text-status-warn-ink' },
  { key: 'tn', abbr: 'TN', title: 'Reprovou e excede o limite', className: 'bg-green-50 text-status-ok-ink' },
]

export function ConfusionMatrix({
  counts,
  unit,
}: {
  counts: ConfusionCounts
  /** Substantivo da observação, no plural: "leituras" ou "designs". */
  unit: string
}) {
  const total = counts.tp + counts.fp + counts.fn + counts.tn
  const exceed = actualExceedances(counts)

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-wp-gray65">Sem {unit} com limite nesta área.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-center text-xs text-wp-gray65">
        <span />
        <span className="font-semibold">Real: dentro do limite</span>
        <span className="font-semibold">Real: excede</span>
        <span className="flex items-center font-semibold [writing-mode:vertical-rl] rotate-180">
          Previsto: aprova
        </span>
        <MatrixCell cell={CELLS[0]} value={counts.tp} unit={unit} />
        <MatrixCell cell={CELLS[1]} value={counts.fp} unit={unit} />
        <span className="flex items-center font-semibold [writing-mode:vertical-rl] rotate-180">
          Previsto: reprova
        </span>
        <MatrixCell cell={CELLS[2]} value={counts.fn} unit={unit} />
        <MatrixCell cell={CELLS[3]} value={counts.tn} unit={unit} />
      </div>
      <p className="tabular text-sm text-wp-gray85">
        {exceed === 0 ? (
          <>Nenhuma excedência real nesta área.</>
        ) : (
          <>
            Das <strong>{formatCount(exceed)}</strong> excedências reais, o modelo aprovou{' '}
            <strong>{formatCount(counts.fp)}</strong> ({formatPct((counts.fp / exceed) * 100)}).
          </>
        )}
      </p>
    </div>
  )
}

function MatrixCell({ cell, value, unit }: { cell: Cell; value: number; unit: string }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center rounded-md px-2 py-4', cell.className)}
      title={cell.title}
    >
      <span className="tabular font-display text-2xl font-semibold">{formatCount(value)}</span>
      <span className="text-xs font-semibold">{cell.abbr}</span>
      <span className="sr-only">
        {cell.title}: {value} {unit}
      </span>
    </div>
  )
}
