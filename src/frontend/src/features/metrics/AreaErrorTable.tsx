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

import type { AreaMetrics } from '@/contract/v1'
import { algorithmLabel } from '@/lib/algorithms'

import { KPI_STATUS_LABEL_PT, kpiStatusForMape, type KpiStatus } from './metricsModel'

const ROW_CLASS: Record<KpiStatus, string> = {
  ok: '',
  warn: 'bg-orange-50',
  danger: 'bg-red-50',
}

const STATUS_TEXT_CLASS: Record<KpiStatus, string> = {
  ok: 'text-status-ok-ink',
  warn: 'text-status-warn-ink',
  danger: 'text-status-danger-ink',
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
            <TableHead>Modelo</TableHead>
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
            const status = kpiStatusForMape(area.mape_pct)
            const selected = area.key_area === selectedKeyArea
            return (
              <TableRow
                key={area.key_area}
                data-key-area={area.key_area}
                data-kpi-status={status}
                data-algorithm={area.algorithm}
                aria-selected={selected}
                onClick={() => onSelectKeyArea?.(area.key_area)}
                className={cn(ROW_CLASS[status], onSelectKeyArea && 'cursor-pointer', selected && 'font-semibold')}
              >
                <TableCell className={cn(selected && 'text-wp-core')}>
                  {areaLabels[area.key_area] ?? area.key_area}
                </TableCell>
                {/* Procedência por rótulo textual, não por cor: a saturação da
                    paleta é reservada ao dado térmico. */}
                <TableCell className="whitespace-nowrap text-xs text-wp-gray65">
                  {algorithmLabel(area.algorithm)}
                </TableCell>
                <TableCell className="tabular text-right">{formatTemp(area.mae)}</TableCell>
                <TableCell className="tabular text-right">{formatTemp(area.rmse)}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(area.r2, 2)}</TableCell>
                <TableCell className={cn('tabular text-right', status !== 'ok' && STATUS_TEXT_CLASS[status])}>
                  {formatPct(area.mape_pct)}
                </TableCell>
                <TableCell className="tabular text-right">{formatRatioPct(area.within_ten_pct_rate, 0)}</TableCell>
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
