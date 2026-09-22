/**
 * Tabela de medidas de erro, uma linha por área. As áreas fora do KPI de erro
 * ≤ 10 % (ou perto dele) recebem destaque por cor E por texto de status, para
 * a leitura não depender só do matiz.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber, formatPct, formatRatioPct, formatTemp } from '@/lib/format'
import { cn } from '@/lib/utils'

import { KPI_STATUS_LABEL_PT, kpiStatusOf, type KpiStatus } from './metricsModel'
import type { AreaMetrics } from './mockMetrics'

const ROW_CLASS: Record<KpiStatus, string> = {
  ok: '',
  warn: 'bg-orange-50',
  danger: 'bg-red-50',
}

const STATUS_TEXT_CLASS: Record<KpiStatus, string> = {
  ok: 'text-status-ok',
  warn: 'text-status-warn',
  danger: 'text-status-danger',
}

export function AreaErrorTable({
  areas,
  areaLabels,
  selectedKeyArea,
  onSelectKeyArea,
}: {
  areas: AreaMetrics[]
  areaLabels: Record<string, string>
  selectedKeyArea: string
  onSelectKeyArea?: (keyArea: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-wp-gray12">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Área</TableHead>
            <TableHead className="text-right">MAE</TableHead>
            <TableHead className="text-right">RMSE</TableHead>
            <TableHead className="text-right">R²</TableHead>
            <TableHead className="text-right">MAPE</TableHead>
            <TableHead className="text-right">Dentro de ±10 %</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {areas.map((area) => {
            const m = area.errorMetrics
            const status = kpiStatusOf(m)
            const selected = area.keyArea === selectedKeyArea
            return (
              <TableRow
                key={area.keyArea}
                data-key-area={area.keyArea}
                data-kpi-status={status}
                aria-selected={selected}
                onClick={() => onSelectKeyArea?.(area.keyArea)}
                className={cn(ROW_CLASS[status], onSelectKeyArea && 'cursor-pointer', selected && 'font-semibold')}
              >
                <TableCell className={cn(selected && 'text-wp-core')}>
                  {areaLabels[area.keyArea] ?? area.keyArea}
                </TableCell>
                <TableCell className="tabular text-right">{formatTemp(m.mae)}</TableCell>
                <TableCell className="tabular text-right">{formatTemp(m.rmse)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(m.r2, 2)}</TableCell>
                <TableCell className={cn('tabular text-right', status !== 'ok' && STATUS_TEXT_CLASS[status])}>
                  {formatPct(m.mapePct)}
                </TableCell>
                <TableCell className="tabular text-right">{formatRatioPct(m.withinTenPctRate, 0)}</TableCell>
                <TableCell className={cn('text-xs font-semibold', STATUS_TEXT_CLASS[status])}>
                  {KPI_STATUS_LABEL_PT[status]}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
