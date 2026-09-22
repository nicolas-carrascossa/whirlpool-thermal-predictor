/**
 * Barras comparativas dos sensores da área. Em arquivo próprio para que o
 * `AreaCard` carregue o `recharts` sob demanda (`React.lazy`) — ele só é
 * usado aqui, então não precisa entrar no chunk principal.
 */

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatNumber, formatTemp } from '@/lib/format'
import { STATUS_COLOR, statusOf } from '@/lib/status'
import type { AreaGroup } from './AreaCard'

export default function AreaBars({ group }: { group: AreaGroup }) {
  const data = group.predictions.map((p) => ({
    name: p.tc_name,
    temp: p.temp_c,
    color: STATUS_COLOR[statusOf(p)],
  }))
  return (
    <div className="h-[120px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="name" hide />
          <YAxis
            width={38}
            tick={{ fontSize: 10, fill: 'var(--wp-gray-65)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            domain={[0, 'dataMax']}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
          />
          <RechartsTooltip
            cursor={{ fill: 'var(--wp-accent-lt)' }}
            contentStyle={{
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid var(--wp-gray-12)',
            }}
            formatter={(value) => [formatTemp(Number(value)), 'Temperatura'] as [string, string]}
          />
          {/* Uma única linha de referência só faz sentido quando todos os
              sensores da área compartilham o mesmo limite normativo — do
              contrário cada barra já carrega sua própria cor de status. */}
          {group.singleLimit !== null && (
            <ReferenceLine
              y={group.singleLimit}
              stroke="var(--status-danger)"
              strokeDasharray="4 3"
              label={{
                value: `limite ${formatTemp(group.singleLimit, 0)}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: 'var(--status-danger)',
              }}
            />
          )}
          <Bar dataKey="temp" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
