/**
 * Barras comparativas dos sensores da área. Em arquivo próprio para que o
 * `AreaCard` carregue o `recharts` sob demanda (`React.lazy`) — ele só é
 * usado aqui, então não precisa entrar no chunk principal.
 */

import {
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatNumber, formatTemp } from '@/lib/format'
import { STATUS_COLOR, statusOf } from '@/lib/status'
import type { AreaGroup } from './AreaCard'

const BAR_RADIUS = 4

interface BarShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: { color: string }
}

/** Barra de cor sólida (a do status), com os cantos de cima arredondados. */
function SolidBar({ x = 0, y = 0, width = 0, height = 0, payload }: BarShapeProps) {
  if (!payload || width <= 0 || height <= 0) return null
  const r = Math.min(BAR_RADIUS, width / 2, height)
  const d = `M${x},${y + height} L${x},${y + r} A${r},${r} 0 0 1 ${x + r},${y} L${x + width - r},${y} A${r},${r} 0 0 1 ${x + width},${y + r} L${x + width},${y + height} Z`
  return <path d={d} fill={payload.color} />
}

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
          <Bar dataKey="temp" isAnimationActive={false} shape={(props: BarShapeProps) => <SolidBar {...props} />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
