/**
 * Dispersão previsto × real de uma área. Em arquivo próprio, `export default`,
 * para o container carregar o `recharts` sob demanda (`React.lazy`), como o
 * `AreaBars` dos resultados.
 *
 * Os dois eixos compartilham o mesmo domínio e a reta y = x tracejada é a
 * referência: ponto acima dela = modelo superestimou; abaixo = subestimou.
 * As séries são separadas por status (cor E forma), para continuarem
 * distinguíveis em daltonismo e impressão em cinza.
 */

import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatNumber, formatTemp } from '@/lib/format'
import { STATUS_COLOR, type SensorStatus } from '@/lib/status'

import { equalAxisDomain, statusForPoint } from './metricsModel'
import type { PredictedVsActualPoint } from './mockMetrics'

type ScatterShape = 'circle' | 'triangle' | 'diamond' | 'square'

const SERIES: { status: SensorStatus; label: string; shape: ScatterShape }[] = [
  { status: 'ok', label: 'Dentro do limite', shape: 'circle' },
  { status: 'warn', label: 'Atenção (≥ 90 %)', shape: 'triangle' },
  { status: 'danger', label: 'Excede o limite', shape: 'diamond' },
  { status: 'monitor', label: 'Monitor (sem limite)', shape: 'square' },
]

interface ScatterDatum extends PredictedVsActualPoint {
  error: number
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: ScatterDatum }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const sign = d.error > 0 ? '+' : ''
  return (
    <div className="rounded-md border border-wp-gray12 bg-white px-3 py-2 font-body text-xs text-wp-gray85 shadow-sm">
      <p className="font-semibold">{d.tcName}</p>
      <p className="text-wp-gray65">{d.run}</p>
      <dl className="tabular mt-1 grid grid-cols-[auto_auto] gap-x-3">
        <dt className="text-wp-gray65">Real</dt>
        <dd>{formatTemp(d.actual)}</dd>
        <dt className="text-wp-gray65">Previsto</dt>
        <dd>{formatTemp(d.predicted)}</dd>
        <dt className="text-wp-gray65">Erro</dt>
        <dd>
          {sign}
          {formatTemp(d.error)}
        </dd>
      </dl>
    </div>
  )
}

export default function PredictedVsActualScatter({ points }: { points: PredictedVsActualPoint[] }) {
  const domain = equalAxisDomain(points)
  const byStatus = new Map<SensorStatus, ScatterDatum[]>()
  for (const p of points) {
    const status = statusForPoint(p)
    const list = byStatus.get(status) ?? []
    list.push({ ...p, error: p.predicted - p.actual })
    byStatus.set(status, list)
  }
  const tick = { fontSize: 10, fill: 'var(--wp-gray-65)' }

  return (
    <div className="h-[340px] w-full min-w-0" role="img" aria-label="Dispersão previsto versus real">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--wp-gray-12)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="actual"
            name="Real"
            domain={domain}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
            label={{ value: 'Real (°C)', position: 'insideBottom', offset: -4, fontSize: 10, fill: 'var(--wp-gray-65)' }}
          />
          <YAxis
            type="number"
            dataKey="predicted"
            name="Previsto"
            domain={domain}
            width={44}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
            label={{ value: 'Previsto (°C)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: 'var(--wp-gray-65)' }}
          />
          <ReferenceLine
            segment={[
              { x: domain[0], y: domain[0] },
              { x: domain[1], y: domain[1] },
            ]}
            stroke="var(--wp-gray-45)"
            strokeDasharray="4 3"
            ifOverflow="visible"
          />
          <RechartsTooltip content={<TooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend
            verticalAlign="top"
            height={28}
            iconSize={9}
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-body)' }}
          />
          {SERIES.map((series) => {
            const data = byStatus.get(series.status)
            if (!data?.length) return null
            return (
              <Scatter
                key={series.status}
                name={series.label}
                data={data}
                fill={STATUS_COLOR[series.status]}
                shape={series.shape}
                isAnimationActive={false}
              />
            )
          })}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
