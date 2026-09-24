/**
 * Um card por `key_area`: leitura rápida (gauge + barras) no cabeçalho e a
 * tabela densa por sensor no corpo. As linhas são ordenadas pela razão
 * temp/limite, de modo que o pior caso da área é sempre a primeira linha.
 */

import { algorithmLabel } from '@/lib/algorithms'
import type { AlgorithmCode } from '@/contract/v1'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { Gauge } from '@/components/Gauge'
import { ReliabilityBadge, StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SensorPrediction } from '@/contract/v1'
import { formatMargin, formatRatioPct, formatTemp } from '@/lib/format'
import { STATUS_COLOR, byLimitRatioDesc, ratioOf, statusOf } from '@/lib/status'
import { cn } from '@/lib/utils'

const AreaBars = lazy(() => import('./AreaBars'))

export interface AreaGroup {
  name: string
  label_pt: string
  /** Algoritmo que atendeu a área — vem da resposta, nunca de mapa local. */
  algorithm?: AlgorithmCode
  predictions: SensorPrediction[]
  /** Maior razão temp/limite da área; `null` quando só há sensores de monitoramento. */
  maxRatio: number | null
  maxTemp: number
  /** Sensor com a pior razão temp/limite da área — base do gauge. `null` sem limite. */
  worstSensor: SensorPrediction | null
  /** Limite normativo, só quando TODOS os sensores da área o compartilham (senão `null`). */
  singleLimit: number | null
}

function RatioBar({ prediction }: { prediction: SensorPrediction }) {
  const ratio = ratioOf(prediction)
  if (ratio === null) {
    return <div className="h-1.5 w-full rounded-full bg-wp-gray12" aria-hidden="true" />
  }
  const status = statusOf(prediction)
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-wp-gray12"
      role="img"
      aria-label={`${formatRatioPct(ratio)} do limite`}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`,
          backgroundColor: STATUS_COLOR[status],
        }}
      />
    </div>
  )
}

function ChartSkeleton() {
  return <div className="h-[120px] w-full min-w-0 animate-pulse rounded-md bg-wp-gray05" aria-hidden="true" />
}

/** Pedido de foco vindo de um pino do 3D; `token` muda a cada clique. */
export interface SensorFocus {
  tcNumber: number
  token: number
}

/** Duração do destaque da linha após um clique no pino (ms). */
export const ROW_FLASH_MS = 1500

export function AreaCard({ group, focus }: { group: AreaGroup; focus?: SensorFocus | null }) {
  const [open, setOpen] = useState(true)
  const [flashTc, setFlashTc] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Clique num pino de sensor no mapa 3D: expande o card, rola a linha até o
  // centro da tela e a pisca em `--wp-accent-lt` por ~1,5 s.
  useEffect(() => {
    if (!focus) return
    setOpen(true)
    setFlashTc(focus.tcNumber)
    const raf = requestAnimationFrame(() => {
      const row = bodyRef.current?.querySelector(`[data-tc-number="${focus.tcNumber}"]`)
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    const timer = setTimeout(() => setFlashTc(null), ROW_FLASH_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [focus])

  const rows = [...group.predictions].sort(byLimitRatioDesc)
  const worst = rows[0]
  const headerStatus = worst ? statusOf(worst) : 'monitor'

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-wp-gray05 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-wp-gray45 transition-transform', !open && '-rotate-90')}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display text-base font-semibold text-wp-core">
            {group.label_pt}
            {group.algorithm && (
              <Badge
                variant="outline"
                className="ml-2 whitespace-nowrap font-normal"
                title={`Modelo que atendeu esta área: ${algorithmLabel(group.algorithm)}`}
              >
                {algorithmLabel(group.algorithm)}
              </Badge>
            )}
          </span>
          <span className="text-xs text-wp-gray65">
            {group.predictions.length} sensor{group.predictions.length === 1 ? '' : 'es'}
          </span>
        </span>
        <span className="tabular text-sm text-wp-gray85">máx. {formatTemp(group.maxTemp)}</span>
        {headerStatus === 'monitor' ? (
          <Badge variant="outline">Monitor</Badge>
        ) : (
          <StatusBadge status={headerStatus} />
        )}
      </button>

      {open && (
        <CardContent ref={bodyRef} className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex flex-col gap-4 border-t border-wp-gray12 pt-4 lg:flex-row lg:items-center">
            {group.worstSensor ? (
              <div className="flex w-[112px] shrink-0 flex-col items-center gap-1">
                <Gauge
                  value={group.worstSensor.temp_c}
                  max={group.worstSensor.active_limit_c ?? group.worstSensor.temp_c}
                  label="Pior razão"
                  size={112}
                />
                <span
                  className="max-w-[130px] text-center text-[11px] leading-snug text-wp-gray65"
                  title={group.worstSensor.tc_name}
                >
                  pior razão: {group.worstSensor.tc_name}
                </span>
              </div>
            ) : (
              <div
                className="flex w-[112px] shrink-0 flex-col items-center gap-1 text-center"
                role="img"
                aria-label="Área só de monitoramento, sem limite normativo para o gauge"
              >
                <span className="tabular text-2xl text-wp-gray45">—</span>
                <span className="text-xs text-wp-gray65">área só de monitoramento</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Suspense fallback={<ChartSkeleton />}>
                <AreaBars group={group} />
              </Suspense>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sensor</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Margem de erro</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead className="w-28">Razão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confiabilidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const status = statusOf(p)
                  return (
                    <TableRow
                      key={p.tc_number}
                      data-tc={p.tc_number}
                      data-tc-number={p.tc_number}
                      data-status={status}
                      data-flash={flashTc === p.tc_number ? 'true' : undefined}
                      className={cn(
                        'transition-colors duration-300 hover:bg-wp-accentLt',
                        status === 'danger' && 'bg-status-danger/5',
                        flashTc === p.tc_number && 'bg-wp-accentLt ring-1 ring-inset ring-wp-accent',
                      )}
                    >
                      <TableCell className="font-semibold text-wp-gray85">{p.tc_name}</TableCell>
                      <TableCell className="tabular whitespace-nowrap">
                        {formatTemp(p.temp_c)}
                      </TableCell>
                      <TableCell className="tabular whitespace-nowrap text-wp-gray65">
                        {formatMargin(p.error_margin_c, p.error_margin_pct)}
                      </TableCell>
                      <TableCell className="tabular whitespace-nowrap">
                        {p.active_limit_c === null ? (
                          <span className="font-body text-wp-gray45">monitor</span>
                        ) : (
                          formatTemp(p.active_limit_c)
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <RatioBar prediction={p} />
                          <span className="tabular text-[11px] text-wp-gray65">
                            {formatRatioPct(ratioOf(p))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {status === 'monitor' ? (
                          <Badge variant="outline">Monitor</Badge>
                        ) : (
                          <StatusBadge status={status} />
                        )}
                      </TableCell>
                      <TableCell>
                        <ReliabilityBadge reliability={p.reliability} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
