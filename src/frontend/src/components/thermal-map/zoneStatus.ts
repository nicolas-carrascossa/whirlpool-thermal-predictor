/**
 * Modo de cor **Status (limite)** (Fase 1d, etapa B) e visibilidade dos
 * rótulos de zona (etapa C).
 *
 * A pergunta do engenheiro é "onde estoura o limite?", não "onde está mais
 * quente" — por isso este é o modo padrão do mapa. A classificação vem
 * inteira de `src/lib/status.ts`: aqui só se escolhe o **pior** sensor da
 * zona e se traduz o status em cor.
 */

import type { SensorPrediction } from '@/contract/v1'
import { statusOf, type SensorStatus } from '@/lib/status'

import { ZONE_GRAY_HEX } from './colorScale'

/** Status de uma zona: o pior dos seus sensores; `none` = sem sensor com limite. */
export type ZoneStatus = 'ok' | 'warn' | 'danger' | 'none'

/** Cores espelhadas de `src/styles/tokens.css` (three.js não lê CSS variables). */
export const ZONE_STATUS_COLOR: Record<ZoneStatus, string> = {
  ok: '#5aa469', // --status-ok
  warn: '#f4a63c', // --status-warn
  danger: '#cf5f57', // --status-danger
  none: ZONE_GRAY_HEX, // --wp-gray-20
}

export const ZONE_STATUS_LABEL_PT: Record<ZoneStatus, string> = {
  ok: 'dentro do limite',
  warn: 'perto do limite',
  danger: 'excede o limite',
  none: 'sem limite normativo',
}

const RANK: Record<SensorStatus, number> = { ok: 1, warn: 2, danger: 3, monitor: 0 }

/** Pior status entre os sensores da área; `none` quando só há monitor/nenhum. */
export function zoneStatusOf(predictions: SensorPrediction[], keyArea: string): ZoneStatus {
  let worst: ZoneStatus = 'none'
  let worstRank = 0
  for (const p of predictions) {
    if (p.key_area !== keyArea) continue
    const s = statusOf(p)
    if (s === 'monitor') continue
    if (RANK[s] > worstRank) {
      worstRank = RANK[s]
      worst = s
    }
  }
  return worst
}

/** Cor da zona no modo `status`. Monitor-only ou sem sensores → cinza. */
export function zoneStatusColor(predictions: SensorPrediction[], keyArea: string): string {
  return ZONE_STATUS_COLOR[zoneStatusOf(predictions, keyArea)]
}

/** Pior sensor da área pela razão temp/limite — alimenta o rótulo no modo status. */
export function worstSensorOf(predictions: SensorPrediction[], keyArea: string): SensorPrediction | null {
  let worst: SensorPrediction | null = null
  let worstRatio = -Infinity
  for (const p of predictions) {
    if (p.key_area !== keyArea || p.active_limit_c === null || p.active_limit_c <= 0) continue
    const ratio = p.temp_c / p.active_limit_c
    if (ratio > worstRatio) {
      worstRatio = ratio
      worst = p
    }
  }
  return worst
}

/* ------------------------------------------------------------------ *
 * Visibilidade dos rótulos
 * ------------------------------------------------------------------ */

export type LabelMode = 'alerts' | 'all' | 'none'

export const LABEL_MODE_LABEL_PT: Record<LabelMode, string> = {
  alerts: 'Alertas',
  all: 'Todos',
  none: 'Nenhum',
}

/**
 * Quais zonas mostram rótulo:
 * - `alerts`: as em atenção/excesso **mais** a zona selecionada;
 * - `all`: todas as zonas com geometria;
 * - `none`: nenhuma (nem a selecionada).
 */
export function visibleLabelZones(
  mode: LabelMode,
  zones: { key: string; status: ZoneStatus }[],
  selectedKeyArea: string | null = null,
): string[] {
  if (mode === 'none') return []
  if (mode === 'all') return zones.map((z) => z.key)
  const out = zones.filter((z) => z.status === 'warn' || z.status === 'danger').map((z) => z.key)
  if (selectedKeyArea && zones.some((z) => z.key === selectedKeyArea) && !out.includes(selectedKeyArea)) {
    out.push(selectedKeyArea)
  }
  return out
}
