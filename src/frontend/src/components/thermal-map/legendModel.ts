/**
 * Modelo puro da legenda in-canvas do mapa térmico (Fase 1d, etapa D).
 *
 * Não depende de React nem de three.js — só de números e das mesmas regras
 * de status/agregação usadas pelo resto do mapa (`src/lib/status.ts` e
 * `aggregate.ts`). É isso que torna `legendModel` testável isoladamente e
 * garante que a legenda nunca diverge da cor de fato desenhada na cena.
 */

import type { SensorPrediction } from '@/contract/v1'
import { statusOf, type SensorStatus } from '@/lib/status'

import { absoluteRange, aggregateByKeyArea, maxAbsDelta } from './aggregate'
import { ZONE_STATUS_COLOR } from './zoneStatus'

/** Os três modos de cor do mapa (fonte canônica — `ThermalMap3D` reexporta). */
export type MapColorMode = 'status' | 'absolute' | 'delta'

export interface StatusLegendRow {
  status: SensorStatus
  label: string
  color: string
  count: number
}

export interface StatusLegendModel {
  mode: 'status'
  rows: StatusLegendRow[]
}

export interface AbsoluteLegendModel {
  mode: 'absolute'
  min: number
  max: number
  /** 5 valores: mín, 25 %, 50 %, 75 %, máx das médias por zona. */
  ticks: number[]
  unit: string
}

export interface DeltaLegendModel {
  mode: 'delta'
  maxAbs: number
  unit: string
}

export type LegendModel = StatusLegendModel | AbsoluteLegendModel | DeltaLegendModel

const STATUS_LABEL_PT: Record<SensorStatus, string> = {
  ok: 'Dentro do limite',
  warn: 'Atenção ≥ 90 %',
  danger: 'Excede o limite',
  monitor: 'Sem limite',
}

const STATUS_COLOR_HEX: Record<SensorStatus, string> = {
  ok: ZONE_STATUS_COLOR.ok,
  warn: ZONE_STATUS_COLOR.warn,
  danger: ZONE_STATUS_COLOR.danger,
  monitor: '#9fa0a1', // --wp-gray-45
}

/** Ordem de exibição: os três status normativos primeiro, monitor por último. */
const STATUS_ORDER: SensorStatus[] = ['ok', 'warn', 'danger', 'monitor']

function statusRows(predictions: SensorPrediction[]): StatusLegendRow[] {
  const counts: Record<SensorStatus, number> = { ok: 0, warn: 0, danger: 0, monitor: 0 }
  for (const p of predictions) counts[statusOf(p)] += 1
  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABEL_PT[status],
    color: STATUS_COLOR_HEX[status],
    count: counts[status],
  }))
}

/** Quantil linear (sem interpolação de biblioteca) sobre um array já ordenado. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const a = sorted[base]
  const b = sorted[base + 1]
  return b !== undefined ? a + (b - a) * rest : a
}

function absoluteTicks(predictions: SensorPrediction[]): { min: number; max: number; ticks: number[] } {
  const aggregates = aggregateByKeyArea(predictions, {})
  const { min, max } = absoluteRange(aggregates)
  const means = aggregates
    .filter((a) => a.hasSensors && a.mean !== null)
    .map((a) => a.mean as number)
    .sort((a, b) => a - b)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((q) => quantile(means, q))
  return { min, max, ticks }
}

/**
 * Constrói a legenda in-canvas do modo ativo.
 * - `status`: contagem de **sensores** (não zonas) em cada status normativo,
 *   mais "Sem limite" — a soma das 4 linhas é sempre o total de
 *   sensores no recorte da consulta.
 * - `absolute`: faixa mín/máx e 5 ticks (quantis) das médias por zona da
 *   consulta atual.
 * - `delta`: maior |delta| entre as zonas, contra `referencePredictions`.
 */
export function legendModel(
  mode: MapColorMode,
  predictions: SensorPrediction[],
  referencePredictions?: SensorPrediction[],
): LegendModel {
  if (mode === 'status') return { mode: 'status', rows: statusRows(predictions) }
  if (mode === 'delta') {
    const aggregates = aggregateByKeyArea(predictions, {}, referencePredictions)
    return { mode: 'delta', maxAbs: maxAbsDelta(aggregates), unit: '°C' }
  }
  const { min, max, ticks } = absoluteTicks(predictions)
  return { mode: 'absolute', min, max, ticks, unit: '°C' }
}
