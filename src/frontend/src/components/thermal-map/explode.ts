/**
 * Vista explodida — constantes e derivações puras (sem React), para o
 * enquadramento e os testes não dependerem da cena 3D.
 */

import type { Bounds } from './zoneGeometry'

export type ExplodeLayerId = 'bay' | 'tray' | 'elements' | 'glass'

/**
 * Quanto cada camada sobe com a explosão a 100 %, em unidades de cena —
 * crescente de baixo para cima: a cavidade fica parada, a baía sobe um pouco,
 * a bandeja mais, os elementos mais, o vidro mais ainda.
 */
export const EXPLODE_LIFT: Record<ExplodeLayerId, number> = {
  bay: 2.5,
  tray: 5.5,
  elements: 8.0,
  glass: 11.0,
}

/**
 * Quanto o painel traseiro (com a zona `Mainback`) recua em -Z com a explosão a
 * 100 %. Soma-se ao recuo de "Abrir traseira": são grupos aninhados.
 */
export const EXPLODE_REAR_PUSH = 7

/** Afastamento inicial ao ligar a vista explodida (%). */
export const DEFAULT_EXPLODE_AMOUNT = 60

/** Recuo do painel traseiro para um `explodeAmount` (0–100). */
export function rearPushFor(amount: number): number {
  return EXPLODE_REAR_PUSH * clampAmount(amount)
}

/** Maior elevação possível — usada para enquadrar o fogão explodido. */
export const EXPLODE_MAX_LIFT = Math.max(...Object.values(EXPLODE_LIFT))

function clampAmount(amount: number): number {
  return Math.min(100, Math.max(0, amount)) / 100
}

/** Elevação de uma camada para um `explodeAmount` (0–100). */
export function layerLiftFor(layer: ExplodeLayerId, amount: number): number {
  return EXPLODE_LIFT[layer] * clampAmount(amount)
}

/** Elevação da camada mais alta para um `explodeAmount` (0–100). */
export function explodeLiftFor(amount: number): number {
  return EXPLODE_MAX_LIFT * clampAmount(amount)
}

/**
 * Caixa de enquadramento para um afastamento da vista explodida: a camada mais
 * alta sobe `explodeLiftFor(amount)` e o painel traseiro recua `rearPushFor(amount)`.
 * Para ser calculada sob demanda (ao trocar
 * preset, ao recentralizar, ao redimensionar) — nunca por quadro, pelos motivos
 * registrados em `zoneGeometry.ts` junto a `STOVE_BOUNDS`.
 */
export function framingBoundsFor(base: Bounds, explodeAmount: number): Bounds {
  const lift = explodeLiftFor(explodeAmount)
  if (lift <= 0) return base
  return {
    min: [base.min[0], base.min[1], base.min[2] - rearPushFor(explodeAmount)],
    max: [base.max[0], base.max[1] + lift, base.max[2]],
  }
}
