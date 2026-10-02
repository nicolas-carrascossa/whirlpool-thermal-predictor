/**
 * Detalhe de uma `key_area` (a escolhida na faixa de áreas): leitura rápida
 * (gauge + barras) e a tabela densa por sensor. Sem dropdown: o card está
 * sempre aberto, quem escolhe qual área ver é a faixa de áreas. As linhas são ordenadas pela razão
 * temp/limite, de modo que o pior caso da área é sempre a primeira linha.
 */

import type { AlgorithmCode } from '@/contract/v1'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { StatusBadge } from '@/components/StatusBadge'
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
import { formatMargin, formatTemp } from '@/lib/format'
import { STATUS_COLOR, byLimitRatioDesc, statusOf } from '@/lib/status'
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

export function AreaCard({
  group,
  focus,
  technicianView = true,
}: {
  group: AreaGroup
  focus?: SensorFocus | null
  /**
   * `false` = visão "não técnico": a tabela só lista sensores em atenção ou
   * acima do limite. Padrão `true` (visão técnica, todos os sensores) para não
   * quebrar quem já usa `AreaCard` sem passar essa prop.
   */
  technicianView?: boolean
}) {
  const [flashTc, setFlashTc] = useState<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Clique num pino de sensor no mapa 3D: rola a linha até o centro da tela e
  // a pisca em `--wp-accent-lt` por ~1,5 s.
  useEffect(() => {
    if (!focus) return
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

  const allRows = [...group.predictions].sort(byLimitRatioDesc)
  const worst = allRows[0]
  const headerStatus = worst ? statusOf(worst) : 'monitor'
  // Sensores que pedem olhar: acima do limite ou em atenção (já vêm no topo da tabela).
  const criticalCount = allRows.filter((p) => ['danger', 'warn'].includes(statusOf(p))).length
  // Visão não técnica: a tabela só lista quem pede atenção. O gráfico continua mostrando todos.
  const rows = technicianView ? allRows : allRows.filter((p) => ['danger', 'warn'].includes(statusOf(p)))

  return (
    <Card className="overflow-hidden">
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="font-display text-base font-semibold text-wp-core">{group.label_pt}</h3>
          <span className="text-xs text-wp-gray65">
            {group.predictions.length} sensor{group.predictions.length === 1 ? '' : 'es'}
          </span>
        </span>
        {criticalCount > 0 ? (
          <span
            className={cn(
              'flex items-center gap-2 text-sm font-bold',
              headerStatus === 'danger' ? 'text-status-danger-ink' : 'text-status-warn-ink',
            )}
          >
            Atenção nestes sensores
            <span
              className="tabular rounded-md px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: STATUS_COLOR[headerStatus] }}
              aria-label={`${criticalCount} sensor${criticalCount === 1 ? '' : 'es'}`}
            >
              {criticalCount}
            </span>
          </span>
        ) : headerStatus === 'monitor' ? (
          <Badge variant="outline">Monitor</Badge>
        ) : (
          <StatusBadge status={headerStatus} />
        )}
      </div>

      <CardContent ref={bodyRef} className="flex flex-col gap-4 p-4 pt-0">
        <div className="min-w-0 border-t border-wp-gray12 pt-4">
          <Suspense fallback={<ChartSkeleton />}>
            <AreaBars group={group} />
          </Suspense>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-md bg-wp-gray05 px-4 py-3 text-sm text-wp-gray65">
            Todos os sensores dentro do limite.
          </p>
        ) : (
        <div className="responsive-sensor-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sensor</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Margem de erro</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Status</TableHead>
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
                      {status === 'monitor' ? (
                        <Badge variant="outline">Monitor</Badge>
                      ) : (
                        <StatusBadge status={status} />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
