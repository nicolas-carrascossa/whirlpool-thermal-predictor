/**
 * Importância das 7 variáveis de configuração para a área selecionada, em
 * barras horizontais ordenadas da maior para a menor. As duas variáveis fora
 * do modelo (`losses`, `board_position` — H2) aparecem zeradas, em cinza, com
 * o mesmo rótulo do painel de configuração: mostrar a ausência de efeito é o
 * ponto, não escondê-las.
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

import type { VariableMeta } from '@/contract/v1'
import { formatPct } from '@/lib/format'

import { importanceData } from './metricsModel'


export default function FeatureImportanceBars({
  importance,
  variables,
}: {
  /** Importância por variável; a API devolve um mapa aberto. */
  importance: Record<string, number>
  variables: VariableMeta[] | undefined
}) {
  const data = importanceData(importance, variables)
  return (
    <div className="h-[280px] w-full min-w-0" role="img" aria-label="Importância das variáveis de configuração">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 140, bottom: 4, left: 8 }}>
          <XAxis
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 10, fill: 'var(--wp-gray-65)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            tickFormatter={(value) => formatPct(Number(value) * 100, 0)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fontSize: 11, fill: 'var(--wp-gray-85)' }}
            tickLine={false}
            axisLine={false}
          />
          <RechartsTooltip
            cursor={{ fill: 'var(--wp-accent-lt)' }}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--wp-gray-12)' }}
            formatter={(value) => [formatPct(Number(value) * 100), 'Importância'] as [string, string]}
          />
          <Bar dataKey="importance" radius={[0, 2, 2, 0]} isAnimationActive={false} minPointSize={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.usedByModel ? 'var(--wp-core)' : 'var(--wp-gray-45)'} />
            ))}
            <LabelList
              dataKey="importance"
              position="right"
              formatter={(value) => (Number(value) > 0 ? formatPct(Number(value) * 100, 0) : '')}
              style={{ fontSize: 10, fill: 'var(--wp-gray-65)' }}
            />
            <LabelList
              dataKey="note"
              position="right"
              style={{ fontSize: 10, fill: 'var(--wp-gray-45)', fontStyle: 'italic' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
