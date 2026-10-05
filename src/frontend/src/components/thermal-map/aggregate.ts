/**
 * Agregação de predições por `key_area`, usada pelo `<ThermalMap3D>` e por
 * qualquer outra visualização que precise de um resumo por área (média,
 * mín/máx, quantos sensores excedem o limite).
 */

import type { SensorPrediction } from '@/contract/v1'

export interface ZoneAggregate {
  /** Nome de `key_area`, chave estável da zona. */
  key: string
  /** Rótulo em pt-BR (de `keyAreaLabels`, ou o próprio `key` como fallback). */
  label: string
  /** `false` quando nenhum sensor desta área está no recorte da consulta atual. */
  hasSensors: boolean
  n: number
  mean: number | null
  min: number | null
  max: number | null
  /** Quantos sensores da área excedem o limite normativo. */
  exceedCount: number
}

function avg(xs: number[]): number {
  return xs.reduce((acc, x) => acc + x, 0) / xs.length
}

/**
 * Agrega `predictions` por `key_area`. O conjunto de zonas retornado é a
 * união das chaves de `keyAreaLabels` com as `key_area` efetivamente
 * presentes em `predictions` — assim uma área sem nenhum sensor no recorte
 * atual ainda aparece (com `hasSensors: false`).
 */
export function aggregateByKeyArea(
  predictions: SensorPrediction[],
  keyAreaLabels: Record<string, string>,
): ZoneAggregate[] {
  const keys = new Set<string>(Object.keys(keyAreaLabels))
  for (const p of predictions) keys.add(p.key_area)

  return [...keys].map((key) => {
    const rows = predictions.filter((p) => p.key_area === key)
    const hasSensors = rows.length > 0
    const temps = rows.map((r) => r.temp_c)
    const mean = hasSensors ? avg(temps) : null
    const min = hasSensors ? Math.min(...temps) : null
    const max = hasSensors ? Math.max(...temps) : null
    const exceedCount = rows.filter((r) => r.exceeds_limit).length

    return {
      key,
      label: keyAreaLabels[key] ?? key,
      hasSensors,
      n: rows.length,
      mean,
      min,
      max,
      exceedCount,
    }
  })
}

/** Mín/máx das médias das zonas com sensores — base da legenda no modo absoluto. */
export function absoluteRange(aggregates: ZoneAggregate[]): { min: number; max: number } {
  const means = aggregates.filter((a) => a.hasSensors && a.mean !== null).map((a) => a.mean as number)
  if (means.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...means), max: Math.max(...means) }
}

/** Formata uma temperatura em pt-BR com uma casa decimal, ex.: "83,4 °C". */
export function formatTempPt(value: number, opts: { withUnit?: boolean; withSign?: boolean } = {}): string {
  const { withUnit = true, withSign = false } = opts
  const sign = withSign && value > 0 ? '+' : ''
  const text = sign + value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return withUnit ? `${text} °C` : text
}
