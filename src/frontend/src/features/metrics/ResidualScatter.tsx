/**
 * Resíduo (previsto − real) em função do valor previsto, para a área
 * selecionada. Complementa a dispersão previsto × real: aquela mostra SE o
 * modelo acerta, esta mostra ONDE ele erra mais — se o erro cresce nas
 * temperaturas mais altas, é justo ali que uma decisão perto do limite
 * precisa de mais desconfiança, e a dispersão previsto × real não deixa isso
 * visível (os pontos problemáticos se escondem perto da diagonal).
 *
 * A faixa cinza horizontal marca ±10 % do valor previsto — o KPI do projeto
 * — para o leitor ver de cabeça quais resíduos estouram a margem aceita, não
 * só a média (MAPE) da área inteira.
 */

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ValidationPoint, ValidationRun } from '@/contract/v1'
import { formatNumber, formatPct, formatTemp } from '@/lib/format'
import { STATUS_COLOR, type SensorStatus } from '@/lib/status'

import { statusForPoint } from './metricsModel'

type ScatterShape = 'circle' | 'triangle' | 'diamond' | 'square'

const SERIES: { status: SensorStatus; label: string; shape: ScatterShape }[] = [
  { status: 'ok', label: 'Dentro do limite', shape: 'circle' },
  { status: 'warn', label: 'Atenção (≥ 90 %)', shape: 'triangle' },
  { status: 'danger', label: 'Excede o limite', shape: 'diamond' },
  { status: 'monitor', label: 'Monitor (sem limite)', shape: 'square' },
]

interface ResidualDatum extends ValidationPoint {
  residual: number
  runLabel: string
  executed: boolean
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: ResidualDatum }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const sign = d.residual > 0 ? '+' : ''
  return (
    <div className="rounded-md border border-wp-gray12 bg-white px-3 py-2 font-body text-xs text-wp-gray85 shadow-sm">
      <p className="font-semibold">{d.tc_name}</p>
      <p className="text-wp-gray65">{d.runLabel}</p>
      {d.executed ? (
        <p className="font-semibold text-wp-core">Ensaio da configuração consultada</p>
      ) : null}
      <dl className="tabular mt-1 grid grid-cols-[auto_auto] gap-x-3">
        <dt className="text-wp-gray65">Previsto</dt>
        <dd>{formatTemp(d.predicted_c)}</dd>
        <dt className="text-wp-gray65">Real</dt>
        <dd>{formatTemp(d.actual_c)}</dd>
        <dt className="text-wp-gray65">Resíduo</dt>
        <dd>
          {sign}
          {formatTemp(d.residual)}
        </dd>
      </dl>
    </div>
  )
}

export default function ResidualScatter({
  points,
  runs,
  executedRun,
}: {
  points: ValidationPoint[]
  runs: ValidationRun[]
  /** Índice do ensaio equivalente à consulta, ou `null` se ela é inédita. */
  executedRun: number | null
}) {
  const byStatus = new Map<SensorStatus, ResidualDatum[]>()
  const executed: ResidualDatum[] = []
  let maxAbs = 1

  for (const p of points) {
    const residual = p.predicted_c - p.actual_c
    maxAbs = Math.max(maxAbs, Math.abs(residual))
    const datum: ResidualDatum = {
      ...p,
      residual,
      runLabel: runs[p.run]?.label ?? `Ensaio ${p.run + 1}`,
      executed: p.run === executedRun,
    }
    if (datum.executed) {
      executed.push(datum)
      continue
    }
    const status = statusForPoint(p)
    const list = byStatus.get(status) ?? []
    list.push(datum)
    byStatus.set(status, list)
  }

  // A faixa do KPI depende do previsto, então precisa de uma série contínua
  // em X para a área sombreada acompanhar a inclinação — os próprios pontos,
  // ordenados, servem de base sem inventar uma curva.
  const bandSeries = [...points]
    .sort((a, b) => a.predicted_c - b.predicted_c)
    .map((p) => ({ predicted_c: p.predicted_c, band: [-0.1 * p.predicted_c, 0.1 * p.predicted_c] as [number, number] }))

  const yPad = maxAbs * 1.15
  const tick = { fontSize: 10, fill: 'var(--wp-gray-65)' }

  if (points.length === 0) {
    return (
      <p className="py-8 text-center font-body text-sm text-wp-gray65">
        Nenhum ensaio de teste cobre os sensores desta consulta.
      </p>
    )
  }

  return (
    <div className="h-[340px] w-full min-w-0" role="img" aria-label="Resíduo (previsto menos real) em função do valor previsto">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--wp-gray-12)" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="predicted_c"
            name="Previsto"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
            label={{ value: 'Previsto (°C)', position: 'insideBottom', offset: -4, fontSize: 10, fill: 'var(--wp-gray-65)' }}
          />
          <YAxis
            type="number"
            dataKey="residual"
            name="Resíduo"
            domain={[-yPad, yPad]}
            width={48}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: 'var(--wp-gray-12)' }}
            tickFormatter={(value) => formatNumber(Number(value), 0)}
            label={{ value: 'Previsto − real (°C)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: 'var(--wp-gray-65)' }}
          />
          <ReferenceLine y={0} stroke="var(--wp-gray-45)" strokeDasharray="4 3" />
          <Area
            data={bandSeries}
            dataKey="band"
            stroke="none"
            fill="var(--wp-gray-12)"
            fillOpacity={0.5}
            isAnimationActive={false}
            legendType="none"
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
          {executed.length ? (
            <Scatter
              name="Configuração consultada"
              data={executed}
              fill="var(--wp-core)"
              stroke="var(--wp-white)"
              strokeWidth={1.5}
              shape="star"
              isAnimationActive={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center font-body text-[10px] text-wp-gray45">
        Faixa cinza: ±{formatPct(10, 0)} do valor previsto — o KPI de erro do projeto.
      </p>
    </div>
  )
}
