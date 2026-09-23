/**
 * Aba "Métricas Estatísticas": diagnóstico do modelo por `key_area`.
 *
 * Escopo: as métricas vêm de `GET /api/v1/metrics`, filtradas pelas áreas do
 * recorte submetido — a aba mostra somente o que corresponde à configuração
 * consultada, como as outras duas.
 *
 * Nada aqui é simulado (v1.2). A dispersão e o mapa de calor liam pares
 * previsto/real sintéticos porque o endpoint não os entregava; agora entrega, e
 * eles são os valores MEDIDOS em laboratório no conjunto de teste de cada área.
 *
 * Dois recortes tornam os quatro cartões relativos à previsão executada:
 * - por área, pelo parâmetro da consulta de métricas;
 * - por termopar, com `scopeToPrediction`: uma consulta de 4 sensores não
 *   mostra o erro dos 10 da área.
 * Quando a configuração consultada coincide com um ensaio de laboratório,
 * `executedRunIndex` o identifica e a dispersão o destaca — é o único caso em
 * que existe um "real" para a configuração que o usuário pediu. Configuração
 * inédita não tem medição, e a tela não finge que tem.
 *
 * Os gráficos do `recharts` são carregados sob demanda (`React.lazy`).
 */

import { lazy, Suspense, useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AreaMetrics, Metadata, PredictionResponse } from '@/contract/v1'
import { useMetricsQuery } from '@/hooks/useThermalQueries'
import { formatCount } from '@/lib/format'

import { AreaErrorTable } from './AreaErrorTable'
import ErrorHeatmap from './ErrorHeatmap'
import { executedRunIndex, scopeToPrediction } from './metricsModel'

const PredictedVsActualScatter = lazy(() => import('./PredictedVsActualScatter'))
const FeatureImportanceBars = lazy(() => import('./FeatureImportanceBars'))
const AreaMaeBars = lazy(() => import('./AreaMaeBars'))

function ChartSkeleton({ height }: { height: number }) {
  return <div aria-hidden="true" className="animate-pulse rounded-md bg-wp-gray05" style={{ height }} />
}

export function MetricsPanel({
  metadata,
  keyAreas,
  response,
}: {
  metadata: Metadata | undefined
  /** Áreas do recorte submetido; vazio/ausente = todas as áreas. */
  keyAreas?: string[]
  /** A previsão executada, à qual esta aba se refere. */
  response?: PredictionResponse
}) {
  const metrics = useMetricsQuery(keyAreas?.length ? keyAreas : undefined)
  const areas: AreaMetrics[] = useMemo(() => metrics.data?.areas ?? [], [metrics.data])

  // Termopares que a consulta devolveu, e o valor previsto para cada um. O
  // primeiro recorta os pares de validação; o segundo identifica o ensaio
  // equivalente à consulta (ver `executedRunIndex`).
  const predictedByTc = useMemo(
    () => new Map((response?.predictions ?? []).map((p) => [p.tc_number, p.temp_c])),
    [response],
  )
  const scopedTcNumbers = useMemo(() => new Set(predictedByTc.keys()), [predictedByTc])

  /** Pares medidos de cada área, já recortados aos termopares da consulta. */
  const validationByArea = useMemo(
    () =>
      areas.map((area) => ({
        keyArea: area.key_area,
        points: scopeToPrediction(area.validation.points, scopedTcNumbers),
      })),
    [areas, scopedTcNumbers],
  )

  // Preferência do usuário, não a seleção efetiva: a área exibida é derivada
  // na renderização, então mudar o recorte não precisa de um efeito para
  // "consertar" um estado que ficou fora dele.
  const [preferredArea, setPreferredArea] = useState<string | null>(null)

  const areaLabels = useMemo(
    () => Object.fromEntries((metadata?.key_areas ?? []).map((a) => [a.name, a.label_pt])),
    [metadata],
  )
  const selected = areas.find((a) => a.key_area === preferredArea) ?? areas[0]
  const selectedLabel = selected ? areaLabels[selected.key_area] ?? selected.key_area : '—'
  const selectedPoints = selected
    ? (validationByArea.find((a) => a.keyArea === selected.key_area)?.points ?? [])
    : []
  const executedRun = executedRunIndex(selectedPoints, predictedByTc)

  if (metrics.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando métricas">
        <ChartSkeleton height={80} />
        <ChartSkeleton height={320} />
      </div>
    )
  }

  if (metrics.error) {
    return (
      <Card>
        <CardContent role="alert" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <TriangleAlert className="h-6 w-6 text-status-danger" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-wp-gray85">
            Não foi possível carregar as métricas
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-wp-gray65">
            {metrics.error instanceof Error ? metrics.error.message : 'Erro desconhecido.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!selected) {
    return (
      <Card>
        <CardContent className="px-6 py-14 text-center text-sm text-wp-gray65">
          Nenhuma área no recorte atual.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[260px] flex-col gap-1.5">
          <Label
            htmlFor="metrics-area"
            className="font-body text-xs font-semibold uppercase tracking-wide text-wp-gray65"
          >
            Área do modelo
          </Label>
          <Select value={selected.key_area} onValueChange={setPreferredArea}>
            <SelectTrigger id="metrics-area" aria-label="Área do modelo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area) => (
                <SelectItem key={area.key_area} value={area.key_area}>
                  {areaLabels[area.key_area] ?? area.key_area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="tabular pb-2 font-body text-xs text-wp-gray65">
          {formatCount(areas.length)} área(s) no recorte · conjunto de modelos{' '}
          <span className="font-semibold">{metrics.data?.model_version ?? '—'}</span>
        </p>
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsto vs. real — {selectedLabel}</CardTitle>
            <CardDescription>
              Cada ponto é uma leitura medida em laboratório no conjunto de teste, restrita aos sensores desta
              consulta. A reta tracejada é y = x: acima dela o modelo superestimou, abaixo subestimou.
              {executedRun !== null ? (
                <>
                  {' '}
                  A estrela marca o ensaio com <strong>a mesma configuração que você consultou</strong>.
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {selectedPoints.length ? (
              <Suspense fallback={<ChartSkeleton height={340} />}>
                <PredictedVsActualScatter
                  points={selectedPoints}
                  runs={selected.validation.runs}
                  executedRun={executedRun}
                />
              </Suspense>
            ) : (
              <p className="py-10 text-center text-sm text-wp-gray65">
                Nenhum ensaio de teste cobre os sensores desta consulta.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Importância das variáveis — {selectedLabel}</CardTitle>
            <CardDescription>
              Quanto cada variável de configuração pesa no modelo desta área. As duas fora do modelo (H2)
              aparecem zeradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton height={280} />}>
              <FeatureImportanceBars
                importance={selected.feature_importance}
                variables={metadata?.variables}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mapa de calor do erro por área</CardTitle>
          <CardDescription>
            Estatísticas do erro absoluto (°C) medido no conjunto de teste, restritas aos sensores desta
            consulta, na mesma escala de cor do mapa 3D. Clique numa área para selecioná-la.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ErrorHeatmap
            areas={validationByArea}
            areaLabels={areaLabels}
            selectedKeyArea={selected.key_area}
            onSelectKeyArea={setPreferredArea}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Medidas de erro por área</CardTitle>
          <CardDescription>
            KPI do projeto: erro ≤ 10 %. A coluna <span className="font-semibold">Modelo</span> mostra o
            algoritmo que atende cada área — sem ela, comparar MAE entre linhas produzidas por modelos
            diferentes induz a conclusão errada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AreaErrorTable
            areas={areas}
            areaLabels={areaLabels}
            selectedKeyArea={selected.key_area}
            onSelectKeyArea={setPreferredArea}
          />
          <Suspense fallback={<ChartSkeleton height={260} />}>
            <AreaMaeBars areas={areas} areaLabels={areaLabels} selectedKeyArea={selected.key_area} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
