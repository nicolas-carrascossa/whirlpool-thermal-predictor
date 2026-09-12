/**
 * Selo do forno (Fase 1d, etapa B): substitui o brilho forte da cavidade por
 * uma informação legível — setpoint do forno e o que está sobre o cooktop.
 * Derivado de `partStateFromConfig`, nunca de texto solto por `run_case`.
 */

import type { StoveConfig } from '@/contract/v1'

import { partStateFromConfig } from './parts'

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "chapa + 2 panelas", "4 panelas", "3 panelas + chapa"… */
export function cooktopLoadTextPt(config: StoveConfig): string {
  const { cooktop } = partStateFromConfig(config)
  const griddles = cooktop.loads.filter((l) => l.kind === 'griddle').length
  const pans = cooktop.loads.filter((l) => l.kind === 'pan').length
  const parts: string[] = []
  if (griddles > 0) parts.push(griddles === 1 ? 'chapa' : plural(griddles, 'chapa', 'chapas'))
  if (pans > 0) parts.push(plural(pans, 'panela', 'panelas'))
  return parts.join(' + ')
}

/** Ex.: "Forno 400 °C · cooktop desligado" / "Forno 280 °C · cooktop ligado (chapa + 2 panelas)". */
export function ovenBadgeText(config: StoveConfig): string {
  const state = partStateFromConfig(config)
  const setpoint = state.ovenGlow.setpointC.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  if (state.cooktop.litSlots.length === 0) {
    return `Forno ${setpoint} °C · cooktop desligado`
  }
  return `Forno ${setpoint} °C · cooktop ligado (${cooktopLoadTextPt(config)})`
}
