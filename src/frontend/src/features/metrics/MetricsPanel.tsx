/**
 * Aba "Métricas Estatísticas": diagnóstico do modelo por `key_area` sobre os
 * dados SIMULADOS de `mockMetrics.ts`. Nada aqui vem da API.
 *
 * Os gráficos do `recharts` são carregados sob demanda (`React.lazy`), como o
 * `AreaBars` dos resultados; o mapa de calor é uma grade CSS e não precisa.
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
import type { Metadata } from '@/contract/v1'
import { formatCount } from '@/lib/format'

import { AreaErrorTable } from './AreaErrorTable'
import ErrorHeatmap from './ErrorHeatmap'
import { METRICS_DISCLAIMER, MOCK_AREA_METRICS, metricsForArea } from './mockMetrics'

const PredictedVsActualScatter = lazy(() => import('./PredictedVsActualScatter'))
const FeatureImportanceBars = lazy(() => import('./FeatureImportanceBars'))
const AreaMaeBars = lazy(() => import('./AreaMaeBars'))

function ChartSkeleton({ height }: { height: number }) {
  return <div aria-hidden="true" className="animate-pulse rounded-md bg-wp-gray05" style={{ height }} />
}

export function MetricsPanel({ metadata }: { metadata: Metadata | undefined }) {
  const [keyArea, setKeyArea] = useState(MOCK_AREA_METRICS[0].keyArea)
  const areaLabels = useMemo(
    () => Object.fromEntries((metadata?.key_areas ?? []).map((a) => [a.name, a.label_pt])),
    [metadata],
  )
  const selected = metricsForArea(keyArea) ?? MOCK_AREA_METRICS[0]
  const selectedLabel = areaLabels[selected.keyArea] ?? selected.keyArea

  return (
    <div className="flex flex-col gap-4">
      <div
        role="note"
        className="flex items-start gap-2 rounded-md border border-status-warn bg-orange-50 px-4 py-3 font-body text-sm text-wp-gray85"
      >
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-warn" strokeWidth={2} aria-hidden="true" />
        <p>
          <span className="font-semibold">Dados simulados.</span> {METRICS_DISCLAIMER}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[260px] flex-col gap-1.5">
          <Label htmlFor="metrics-area" className="font-body text-xs font-semibold uppercase tracking-wide text-wp-gray65">
            Área do modelo
          </Label>
          <Select value={keyArea} onValueChange={setKeyArea}>
            <SelectTrigger id="metrics-area" aria-label="Área do modelo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_AREA_METRICS.map((area) => (
                <SelectItem key={area.keyArea} value={area.keyArea}>
                  {areaLabels[area.keyArea] ?? area.keyArea}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="tabular pb-2 font-body text-xs text-wp-gray65">
          {formatCount(selected.predictedVsActual.length)} pares previsto/real no conjunto de teste
        </p>
      </div>

      <div className="grid gap-4 min-[1100px]:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsto vs. real — {selectedLabel}</CardTitle>
            <CardDescription>
              Cada ponto é uma leitura de sensor no conjunto de teste. A reta tracejada é y = x: acima dela o
              modelo superestimou, abaixo subestimou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton height={340} />}>
              <PredictedVsActualScatter points={selected.predictedVsActual} />
            </Suspense>
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
              <FeatureImportanceBars importance={selected.featureImportance} variables={metadata?.variables} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mapa de calor do erro por área</CardTitle>
          <CardDescription>
            Estatísticas do erro absoluto (°C) em cada área, na mesma escala de cor do mapa 3D. Clique numa
            área para selecioná-la.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorHeatmap
            areas={MOCK_AREA_METRICS}
            areaLabels={areaLabels}
            selectedKeyArea={selected.keyArea}
            onSelectKeyArea={setKeyArea}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Medidas de erro por área</CardTitle>
          <CardDescription>
            KPI do projeto: erro ≤ 10 %. Áreas em laranja estão perto do limite; em vermelho, fora dele.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AreaErrorTable
            areas={MOCK_AREA_METRICS}
            areaLabels={areaLabels}
            selectedKeyArea={selected.keyArea}
            onSelectKeyArea={setKeyArea}
          />
          <Suspense fallback={<ChartSkeleton height={260} />}>
            <AreaMaeBars areas={MOCK_AREA_METRICS} areaLabels={areaLabels} selectedKeyArea={selected.keyArea} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
