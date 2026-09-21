/**
 * MAE comparado entre as 7 áreas. Barras coloridas pela situação frente ao
 * KPI (ok / atenção / fora), com o valor rotulado em cada barra para a leitura
 * não depender só da cor.
 */

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatNumber, formatTemp } from '@/lib/format'

import { kpiStatusOf, type KpiStatus } from './metricsModel'
import type { AreaMetrics } from './mockMetrics'

const KPI_COLOR: Record<KpiStatus, string> = {
  ok: 'var(--status-ok)',
  warn: 'var(--status-warn)',
  danger: 'var(--status-danger)',
}

export default function AreaMaeBars({
  areas,
  areaLabels,
  selectedKeyArea,
}: {
  areas: AreaMetrics[]
  areaLabels: Record<string, string>
  selectedKeyArea: string
}) {
  const data = areas.map((a) => ({
    keyArea: a.keyArea,
    label: areaLabels[a.keyArea] ?? a.keyArea,
    mae: a.errorMetrics.mae,
    status: kpiStatusOf(a.errorMetrics),
  }))
  return (
    <div className="h-[260px] w-full min-w-0" role="img" aria-label="Erro absoluto médio por área">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tick={{ fontSize: 10, fill: 'var(--wp-gray-65)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tick={{ fontSize: 11, fill: 'var(--wp-gray-85)' }}
            tickLine={false}
            axisLine={false}
          />
          <RechartsTooltip
            cursor={{ fill: 'var(--wp-accent-lt)' }}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--wp-gray-12)' }}
            formatter={(value) => [formatTemp(Number(value)), 'MAE'] as [string, string]}
          />
          <Bar dataKey="mae" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.keyArea}
                fill={KPI_COLOR[d.status]}
                stroke={d.keyArea === selectedKeyArea ? 'var(--wp-core)' : undefined}
                strokeWidth={d.keyArea === selectedKeyArea ? 2 : 0}
              />
            ))}
            <LabelList
              dataKey="mae"
              position="right"
              formatter={(value) => formatTemp(Number(value))}
              style={{ fontSize: 10, fill: 'var(--wp-gray-65)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
