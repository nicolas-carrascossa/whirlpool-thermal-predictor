/**
 * Análise técnica da área em exibição (visão "Técnico"), em três blocos:
 *  1. Comparação com uma base escolhida (uma consulta do Histórico): Δ por área e por sensor;
 *  2. Variáveis alteradas em relação a essa base e o quanto cada uma pesa no modelo da área;
 *  3. Sensibilidade: o que acontece ao trocar uma variável por vez.
 *
 * Não há base padrão: comparar com uma configuração arbitrária (como a mais
 * frequente nos ensaios, que nem sempre está dentro dos limites) induz a
 * leitura errada. Sem base escolhida, os blocos 1 e 2 ficam em espera.
 *
 * Tudo vem de previsões e métricas que a API já entrega. A importância das
 * variáveis é global por modelo (`feature_importances_`), não uma contribuição
 * por predição; a tela diz isso, e o Δ é o efeito real da troca.
 */

import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type {
  Metadata,
  PredictionRequest,
  PredictionResponse,
  Reliability,
  StoveConfig,
} from '@/contract/v1'
import { VARIABLE_LABEL_EN } from '@/features/config/variableLabels'
import {
  useBasePredictionQuery,
  useMetricsQuery,
  useSensitivityQueries,
} from '@/hooks/useThermalQueries'
import { formatNumber, formatPct, formatTemp } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  anchorSensor,
  areaDeltas,
  changedVariables,
  rankSensitivity,
  sensitivityCases,
  sensitivityEffect,
  sensorDeltas,
  worstReliability,
  type SensitivityRow,
  type SensitivityTarget,
} from './analysisModel'

const COLOR_UP = '#e08650'
const COLOR_DOWN = '#00a0dd'

const RELIABILITY_SHORT: Record<Reliability, string> = {
  interpolation: 'ensaiada',
  moderate_extrapolation: 'extrapolação moderada',
  out_of_domain: 'fora do domínio',
}

/** Uma consulta salva que pode servir de base de comparação. */
export interface BaseOption {
  id: number
  name: string
  /** ISO-8601 de quando a consulta foi feita. */
  createdAt: string
  request: PredictionRequest
}

/** Δ com sinal explícito: `+3,2 °C`, `−1,0 °C`. */
function formatDelta(value: number): string {
  // Arredonda antes de decidir o sinal: −0,02 °C aparece como "0,0 °C", não "−0,0 °C".
  const rounded = Math.round(value * 10) / 10
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${formatTemp(Math.abs(rounded))}`
}

function variableLabel(name: keyof StoveConfig): string {
  return VARIABLE_LABEL_EN[name] ?? name
}

function configsEqual(a: StoveConfig, b: StoveConfig): boolean {
  return (Object.keys(a) as (keyof StoveConfig)[]).every((k) => a[k] === b[k])
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-wp-gray12 pt-4 first:border-t-0 first:pt-0">
      <div>
        <h4 className="font-display text-sm font-bold text-wp-core">{title}</h4>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-wp-gray65">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Barra centrada em zero: à direita aquece (laranja), à esquerda esfria (azul). */
function DivergingBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const width = Math.min(50, (Math.abs(value) / maxAbs) * 50)
  return (
    <span aria-hidden="true" className="relative block h-2.5 rounded-full bg-wp-gray05">
      <span className="absolute inset-y-0 left-1/2 w-px bg-wp-gray20" />
      <span
        className="absolute inset-y-0 rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: value >= 0 ? COLOR_UP : COLOR_DOWN,
          ...(value >= 0 ? { left: '50%' } : { right: '50%' }),
        }}
      />
    </span>
  )
}

// ------------------------------------------------------------------ 1. Comparação com uma base

/** Colunas fixas: todas as barras compartilham o mesmo zero e a mesma escala. */
const AREA_ROW_GRID = 'grid grid-cols-[9rem_minmax(6rem,1fr)_13rem] items-center gap-3'

function BaseComparison({
  response,
  baseResponse,
  baseName,
  keyArea,
  areaLabels,
  isLoading,
  isError,
}: {
  response: PredictionResponse
  baseResponse: PredictionResponse | undefined
  baseName: string
  keyArea: string
  areaLabels: Record<string, string>
  isLoading: boolean
  isError: boolean
}) {
  const areas = useMemo(
    () => (baseResponse ? areaDeltas(response.predictions, baseResponse.predictions) : []),
    [response, baseResponse],
  )
  const sensors = useMemo(
    () => (baseResponse ? sensorDeltas(response.predictions, baseResponse.predictions, keyArea) : []),
    [response, baseResponse, keyArea],
  )

  if (isError) {
    return (
      <p role="alert" className="text-xs text-status-danger-ink">
        Não foi possível calcular a previsão da base escolhida.
      </p>
    )
  }
  if (isLoading || !baseResponse) {
    return <p className="text-sm text-wp-gray65">Carregando a previsão de “{baseName}”…</p>
  }
  if (areas.length === 0) {
    return <p className="text-sm text-wp-gray65">Nenhum sensor em comum entre a consulta e a base.</p>
  }

  const maxAbs = Math.max(...areas.map((a) => Math.abs(a.meanDelta)), 0.001)

  return (
    <>
      <ul className="flex flex-col gap-1.5" aria-label="Δ médio por área">
        {areas.map((a) => (
          <li
            key={a.keyArea}
            className={cn(AREA_ROW_GRID, 'rounded-md px-2 py-1 text-xs', a.keyArea === keyArea && 'bg-wp-accentLt')}
          >
            <span className="truncate font-semibold text-wp-gray85">{areaLabels[a.keyArea] ?? a.keyArea}</span>
            <DivergingBar value={a.meanDelta} maxAbs={maxAbs} />
            <span className="tabular text-right leading-snug text-wp-gray65">
              médio {formatDelta(a.meanDelta)}
              <span className="block text-[11px] text-wp-gray45">
                pico {a.peak.name} {formatDelta(a.peak.delta)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="responsive-sensor-table overflow-x-auto rounded-md border border-wp-gray12">
        <table className="w-full text-xs" aria-label={`Δ por sensor em ${areaLabels[keyArea] ?? keyArea}`}>
          <thead className="bg-wp-gray05 text-left text-wp-gray65">
            <tr>
              <th className="px-3 py-2 font-semibold">Sensor</th>
              <th className="px-3 py-2 text-right font-semibold">Base</th>
              <th className="px-3 py-2 text-right font-semibold">Consulta</th>
              <th className="px-3 py-2 text-right font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((s) => (
              <tr key={s.tcNumber} className="border-t border-wp-gray12">
                <td className="px-3 py-1.5 font-semibold text-wp-gray85">{s.name}</td>
                <td className="tabular px-3 py-1.5 text-right text-wp-gray65">{formatTemp(s.base)}</td>
                <td className="tabular px-3 py-1.5 text-right">{formatTemp(s.current)}</td>
                <td className="tabular px-3 py-1.5 text-right font-semibold">{formatDelta(s.delta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ 2. Variáveis alteradas

function ChangedVariables({
  metadata,
  config,
  baseConfig,
  keyArea,
}: {
  metadata: Metadata
  config: StoveConfig
  baseConfig: StoveConfig
  keyArea: string
}) {
  const metrics = useMetricsQuery([keyArea])
  const importance = metrics.data?.areas.find((a) => a.key_area === keyArea)?.feature_importance
  const rows = useMemo(
    () => changedVariables(config, baseConfig, metadata.variables, importance),
    [metadata, config, baseConfig, importance],
  )

  if (rows.length === 0) {
    return <p className="text-sm text-wp-gray65">Nenhuma variável difere da base.</p>
  }

  const top = rows[0]
  return (
    <>
      <p className="text-xs leading-relaxed text-wp-gray65">
        Variáveis alteradas em relação à base. Importância é global no modelo da área (feature_importances_), não a
        contribuição nesta consulta; para o efeito real de cada troca, veja a sensibilidade abaixo.
      </p>
      <ul className="flex flex-col divide-y divide-wp-gray12 rounded-md border border-wp-gray12">
        {rows.map((r) => (
          <li key={r.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs">
            <span className="min-w-[9rem] font-semibold text-wp-gray85">{variableLabel(r.name)}</span>
            <span className="text-wp-gray65">
              {r.from} <span aria-hidden="true">→</span>
              <span className="sr-only"> para </span> <span className="font-semibold text-wp-gray85">{r.to}</span>
            </span>
            <span className="tabular ml-auto text-right text-wp-gray65">
              {!r.usedByModel ? (
                <Badge variant="outline" className="border-dashed px-2 py-0 text-[10px] font-normal">
                  não usada pelo modelo
                </Badge>
              ) : r.importance === null ? (
                '—'
              ) : (
                <>
                  pesa <span className="font-semibold text-wp-gray85">{formatPct(r.importance * 100, 0)}</span> no
                  modelo
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {top.usedByModel && top.importance !== null && (
        <p className="text-xs leading-relaxed text-wp-gray65">
          A variável alterada que mais pesa neste modelo é{' '}
          <span className="font-semibold text-wp-gray85">{variableLabel(top.name)}</span> (
          {formatPct(top.importance * 100, 0)}).
        </p>
      )}
    </>
  )
}

/** Seletor de base + os dois blocos que dependem dela. */
function BaseSection({
  metadata,
  request,
  response,
  keyArea,
  areaLabels,
  baseOptions,
}: {
  metadata: Metadata
  request: PredictionRequest
  response: PredictionResponse
  keyArea: string
  areaLabels: Record<string, string>
  baseOptions: BaseOption[]
}) {
  const [baseId, setBaseId] = useState<number | null>(null)
  // Uma consulta com a mesma configuração da atual não compara nada.
  const options = useMemo(
    () => baseOptions.filter((o) => !configsEqual(o.request.config, request.config)),
    [baseOptions, request.config],
  )
  const base = options.find((o) => o.id === baseId) ?? null
  const baseQuery = useBasePredictionQuery(request, base?.request.config ?? null)

  return (
    <Section
      title="Comparar com uma base"
      hint="Escolha uma consulta do Histórico. Δ = temperatura prevista da consulta atual − a da base, em °C."
    >
      {options.length === 0 ? (
        <p className="text-sm text-wp-gray65">
          Não há outra consulta no Histórico para comparar. Ao iniciar uma consulta, escolha “Sim, registrar” para
          guardá-la e usá-la como base depois.
        </p>
      ) : (
        <label className="flex flex-wrap items-center gap-2 text-xs text-wp-gray65">
          Comparar com
          <select
            value={base ? String(base.id) : ''}
            onChange={(e) => setBaseId(e.target.value === '' ? null : Number(e.target.value))}
            className="h-8 max-w-full rounded-md border border-wp-gray20 bg-white px-2 text-xs text-wp-gray85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecione uma consulta…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {base && (
        <>
          <BaseComparison
            response={response}
            baseResponse={baseQuery.data}
            baseName={base.name}
            keyArea={keyArea}
            areaLabels={areaLabels}
            isLoading={baseQuery.isFetching && !baseQuery.data}
            isError={baseQuery.isError}
          />
          <ChangedVariables
            metadata={metadata}
            config={request.config}
            baseConfig={base.request.config}
            keyArea={keyArea}
          />
        </>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------ 3. Sensibilidade

/**
 * Colunas com largura definida (a da direita é fixa, a do meio tem piso): todas as
 * linhas ocupam o mesmo espaço, então as barras compartilham o mesmo zero e a mesma
 * escala, com ou sem selo de confiabilidade.
 */
const SENSITIVITY_ROW_GRID =
  'grid grid-cols-[minmax(0,1.2fr)_minmax(6rem,1fr)_16rem] items-center gap-3'

function SensitivityTable({ rows, peak }: { rows: SensitivityRow[]; peak: boolean }) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 0.001)
  return (
    <ul className="flex flex-col gap-1" aria-label="Sensibilidade por troca de variável">
      {rows.map((r) => (
        <li
          key={`${r.variable}:${r.to}`}
          className={cn(SENSITIVITY_ROW_GRID, 'rounded-md px-2 py-1 text-xs hover:bg-wp-gray05')}
        >
          <span className="min-w-0">
            <span className="font-semibold text-wp-gray85">{variableLabel(r.variable)}</span>
            <span className="text-wp-gray65">
              {' '}
              {r.from} <span aria-hidden="true">→</span>
              <span className="sr-only"> para </span> {r.to}
            </span>
            {peak && <span className="block text-[11px] text-wp-gray45">maior efeito em {r.sensor}</span>}
          </span>
          <DivergingBar value={r.delta} maxAbs={maxAbs} />
          <span className="tabular flex items-center justify-end gap-2 whitespace-nowrap text-right">
            <span className="font-semibold text-wp-gray85">{formatDelta(r.delta)}</span>
            {r.reliability !== 'interpolation' && (
              <Badge
                variant="outline"
                className={cn(
                  'px-1.5 py-0 text-[10px] font-normal',
                  r.reliability === 'out_of_domain' ? 'border-status-danger' : 'border-status-warn',
                )}
                title="Esta combinação não foi ensaiada: trate o valor como indicativo."
              >
                {RELIABILITY_SHORT[r.reliability]}
              </Badge>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Sensitivity({
  metadata,
  request,
  response,
  keyArea,
}: {
  metadata: Metadata
  request: PredictionRequest
  response: PredictionResponse
  keyArea: string
}) {
  const [requested, setRequested] = useState(false)
  const cases = useMemo(() => sensitivityCases(request.config, metadata), [request.config, metadata])
  const areaSensors = useMemo(
    () => response.predictions.filter((p) => p.key_area === keyArea),
    [response, keyArea],
  )
  // Onde medir o efeito: o sensor que mais se move em cada troca (padrão) ou um termopar fixo.
  // Trocar isso só reorganiza as previsões já feitas; não dispara nada novo.
  const [target, setTarget] = useState<SensitivityTarget>('peak')
  const anchor = useMemo(() => anchorSensor(areaSensors), [areaSensors])
  const queries = useSensitivityQueries(
    request,
    keyArea,
    cases.map((c) => c.config),
    requested,
  )

  const done = queries.filter((q) => q.data).length
  const failed = queries.some((q) => q.isError)
  const rows: SensitivityRow[] = useMemo(() => {
    const out: SensitivityRow[] = []
    cases.forEach((c, i) => {
      const data = queries[i]?.data
      if (!data) return
      const effect = sensitivityEffect(areaSensors, data.predictions, target)
      if (!effect) return
      out.push({
        variable: c.variable,
        from: c.from,
        to: c.to,
        sensor: effect.sensor,
        delta: effect.delta,
        reliability: worstReliability(data.predictions),
      })
    })
    return rankSensitivity(out)
  }, [cases, queries, areaSensors, target])

  const title = 'Sensibilidade'
  const hint =
    'Troca uma variável por vez na configuração atual e mostra o efeito na temperatura prevista. Escolha onde medir: no sensor que mais se move em cada troca ou em um sensor específico.'

  return (
    <Section title={title} hint={hint}>
      {!requested ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="secondary" disabled={areaSensors.length === 0 || cases.length === 0} onClick={() => setRequested(true)}>
            Calcular sensibilidade
          </Button>
          <span className="text-xs text-wp-gray65">
            Faz {formatNumber(cases.length, 0)} previsões, restritas a esta área.
          </span>
        </div>
      ) : done < cases.length && !failed ? (
        <p role="status" className="text-sm text-wp-gray65">
          Calculando… {formatNumber(done, 0)} de {formatNumber(cases.length, 0)}
        </p>
      ) : (
        <>
          {failed && (
            <p role="alert" className="text-xs text-status-danger-ink">
              {formatNumber(queries.filter((q) => q.isError).length, 0)} previsão(ões) falharam; o ranking abaixo está
              incompleto.
            </p>
          )}
          <label className="flex flex-wrap items-center gap-2 text-xs text-wp-gray65">
            Medir o efeito em
            <select
              value={String(target)}
              onChange={(e) => setTarget(e.target.value === 'peak' ? 'peak' : Number(e.target.value))}
              className="h-8 rounded-md border border-wp-gray20 bg-white px-2 text-xs text-wp-gray85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="peak">Maior efeito na área</option>
              {[...areaSensors]
                .sort((a, b) => a.tc_number - b.tc_number)
                .map((s) => (
                  <option key={s.tc_number} value={s.tc_number}>
                    {s.tc_name}
                    {anchor?.tc_number === s.tc_number ? ' (mais crítico)' : ''}
                  </option>
                ))}
            </select>
          </label>
          <SensitivityTable rows={rows} peak={target === 'peak'} />
        </>
      )}
    </Section>
  )
}

// ------------------------------------------------------------------ painel

export function AnalysisPanel({
  metadata,
  request,
  response,
  baseOptions,
  keyArea,
  keyAreaLabel,
}: {
  metadata: Metadata
  request: PredictionRequest
  response: PredictionResponse
  /** Consultas do Histórico que podem servir de base de comparação. */
  baseOptions: BaseOption[]
  keyArea: string
  keyAreaLabel: string
}) {
  const areaLabels = useMemo(
    () => Object.fromEntries(metadata.key_areas.map((a) => [a.name, a.label_pt])),
    [metadata],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Análise técnica — {keyAreaLabel}</CardTitle>
        <CardDescription>
          Efeito das variáveis na previsão desta área. Os valores estimam a simulação (CFD), não uma medição física.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* `key` zera a base ao trocar de área ou de configuração. */}
        <BaseSection
          key={`base|${keyArea}|${JSON.stringify(request.config)}`}
          metadata={metadata}
          request={request}
          response={response}
          keyArea={keyArea}
          areaLabels={areaLabels}
          baseOptions={baseOptions}
        />
        {/* `key` zera o pedido ao trocar de área ou de configuração: o cálculo é caro e sempre sob demanda. */}
        <Sensitivity
          key={`sensibilidade|${keyArea}|${JSON.stringify(request.config)}`}
          metadata={metadata}
          request={request}
          response={response}
          keyArea={keyArea}
        />
      </CardContent>
    </Card>
  )
}
