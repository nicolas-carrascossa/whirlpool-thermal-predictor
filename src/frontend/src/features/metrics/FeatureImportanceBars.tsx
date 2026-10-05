/**
 * Importância das 7 variáveis de configuração para a área selecionada, em
 * formato waterfall: cada barra soma a importância de uma variável ao
 * acumulado das anteriores, ordenadas da maior para a menor, até fechar em
 * 100%. Uma variável que o modelo no ar não usa aparece com barra zerada, em
 * cinza, com o mesmo rótulo do painel de configuração: mostrar a ausência de
 * efeito é o ponto, não escondê-la. Quem decide isso é `VariableMeta.used_by_model`,
 * vindo do back-end — este componente não sabe, e não deve saber, o nome de
 * nenhuma variável.
 *
 * Os valores vêm de `feature_importances_` do scikit-learn (import./do
 * Gradient Boosting/Random Forest), globais e estáticos por modelo — não são
 * contribuições SHAP por predição. Este gráfico não deve ser rotulado como
 * "SHAP" em nenhuma tela.
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

interface WaterfallDatum {
  name: string
  label: string
  usedByModel: boolean
  note: string
  /** Início do trecho acumulado (invisível, só empurra a barra visível). */
  base: number
  /** Importância desta variável — o trecho visível da barra. */
  importance: number
  /** Fim do trecho acumulado, para o tooltip. */
  cumulative: number
  /** Texto do rótulo à direita da barra: percentual OU nota, nunca os dois. */
  barLabel: string
}

function toWaterfall(data: ReturnType<typeof importanceData>): WaterfallDatum[] {
  let running = 0
  return data.map((d) => {
    const base = running
    running += d.importance
    return {
      name: d.name,
      label: d.label,
      usedByModel: d.usedByModel,
      note: d.note,
      base,
      importance: d.importance,
      cumulative: running,
      barLabel: d.note || (d.importance > 0 ? formatPct(d.importance * 100, 0) : ''),
    }
  })
}

export default function FeatureImportanceBars({
  importance,
  variables,
}: {
  /** Importância por variável; a API devolve um mapa aberto. */
  importance: Record<string, number>
  variables: VariableMeta[] | undefined
}) {
  const data = toWaterfall(importanceData(importance, variables))
  return (
    <div className="h-[280px] w-full min-w-0" role="img" aria-label="Waterfall da importância das variáveis de configuração">
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
            formatter={(_, __, item) => {
              const d = item.payload as WaterfallDatum
              return [
                `${formatPct(d.importance * 100)} (acumulado: ${formatPct(d.cumulative * 100)})`,
                'Importância',
              ] as [string, string]
            }}
          />
          <Bar dataKey="base" stackId="waterfall" isAnimationActive={false} fill="transparent" />
          <Bar dataKey="importance" stackId="waterfall" radius={[0, 2, 2, 0]} isAnimationActive={false} minPointSize={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.usedByModel ? 'var(--wp-core)' : 'var(--wp-gray-45)'} />
            ))}
            <LabelList
              dataKey="barLabel"
              position="right"
              style={{ fontSize: 10, fill: 'var(--wp-gray-65)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
