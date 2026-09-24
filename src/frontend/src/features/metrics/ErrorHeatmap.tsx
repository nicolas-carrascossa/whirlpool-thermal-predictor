/**
 * Mapa de calor do erro por área: linhas = key_areas, colunas = estatísticas
 * do erro absoluto (MAE, RMSE, mediana, p90, máximo), todas em °C, calculadas
 * dos pares previsto/real MEDIDOS em laboratório e recortados aos termopares da
 * consulta. Recharts não
 * tem heatmap nativo, então é uma grade CSS de células coloridas pela mesma
 * escala do mapa 3D (`heatColorHex`), com a legenda compartilhada.
 *
 * Cor nunca é o único canal: cada célula mostra o valor numérico, com a cor do
 * texto escolhida pela luminância do fundo. A área selecionada é destacada com
 * borda para a leitura casar com os outros gráficos da aba.
 */

import { HeatScaleLegend } from '@/components/HeatScaleLegend'
import type { ValidationPoint } from '@/contract/v1'
import { heatColorHex } from '@/components/thermal-map/colorScale'
import { formatTemp } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ERROR_PROFILE_COLUMNS, errorProfileOf, textColorForBackground } from './metricsModel'

export default function ErrorHeatmap({
  areas,
  areaLabels,
  selectedKeyArea,
  onSelectKeyArea,
}: {
  /**
   * Áreas do recorte com os pares previsto/real JÁ recortados aos termopares da
   * consulta. As estatísticas são calculadas aqui, dos próprios resíduos, para
   * o mapa responder exatamente à previsão executada — e não à área inteira.
   */
  areas: { keyArea: string; points: ValidationPoint[] }[]
  areaLabels: Record<string, string>
  selectedKeyArea: string
  onSelectKeyArea?: (keyArea: string) => void
}) {
  const rows = areas
    .filter((area) => area.points.length > 0)
    .map((area) => ({ keyArea: area.keyArea, profile: errorProfileOf(area.points) }))
  const values = rows.flatMap((r) => ERROR_PROFILE_COLUMNS.map((c) => r.profile[c.key]))
  // Sem `values`, `Math.min(...[])` é `Infinity` e a escala de cor sai NaN.
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const span = max - min || 1

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center font-body text-sm text-wp-gray65">
        Nenhum ensaio de teste cobre os sensores desta consulta.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          role="table"
          aria-label="Mapa de calor do erro absoluto por área e estatística, em graus Celsius"
          className="grid min-w-[560px] gap-1"
          style={{ gridTemplateColumns: `minmax(160px, 1.4fr) repeat(${ERROR_PROFILE_COLUMNS.length}, minmax(72px, 1fr))` }}
        >
          <div role="row" className="contents">
            <div role="columnheader" className="px-2 py-1 font-body text-[11px] font-semibold uppercase tracking-wide text-wp-gray65">
              Área
            </div>
            {ERROR_PROFILE_COLUMNS.map((column) => (
              <div
                key={column.key}
                role="columnheader"
                className="px-2 py-1 text-center font-body text-[11px] font-semibold uppercase tracking-wide text-wp-gray65"
              >
                {column.label}
              </div>
            ))}
          </div>
          {rows.map((row) => {
            const selected = row.keyArea === selectedKeyArea
            return (
              <div role="row" key={row.keyArea} className="contents">
                <div role="rowheader" className="flex items-center">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectKeyArea?.(row.keyArea)}
                    className={cn(
                      'w-full rounded-md px-2 py-1.5 text-left font-body text-xs leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'bg-wp-accentLt font-semibold text-wp-core' : 'text-wp-gray85 hover:bg-wp-gray05',
                    )}
                  >
                    {areaLabels[row.keyArea] ?? row.keyArea}
                  </button>
                </div>
                {ERROR_PROFILE_COLUMNS.map((column) => {
                  const value = row.profile[column.key]
                  const background = heatColorHex((value - min) / span)
                  return (
                    <div
                      key={column.key}
                      role="cell"
                      data-key-area={row.keyArea}
                      data-metric={column.key}
                      className={cn(
                        'tabular flex items-center justify-center rounded-md px-2 py-2 font-body text-xs font-semibold',
                        selected && 'ring-2 ring-inset ring-wp-core',
                      )}
                      style={{ backgroundColor: background, color: textColorForBackground(background) }}
                      title={`${areaLabels[row.keyArea] ?? row.keyArea} — ${column.label}: ${formatTemp(value)}`}
                    >
                      {formatTemp(value)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div className="max-w-md">
        <HeatScaleLegend min={min} max={max} />
      </div>
    </div>
  )
}
