/**
 * Posicionamento dos pinos de sensor sobre a superfície de cada zona
 * (Fase 1d, etapa C).
 *
 * `pinPositionsForZone` é **pura e determinística**: a mesma zona com a mesma
 * quantidade de sensores devolve sempre as mesmas posições, de modo que um
 * pino não "pula" quando o recorte da consulta muda.
 */

import { ZONE_PIN_FACE, zoneBounds, type Bounds } from './zoneGeometry'

/** Quanto o pino se afasta da superfície da zona, em unidades de cena. */
export const PIN_SURFACE_OFFSET = 0.55
/** Raio do pino (esfera). */
export const PIN_RADIUS = 0.35

/** Hash determinístico (FNV-1a de 32 bits) — sem `Math.random`. */
function hash32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Pseudoaleatório em 0…1 a partir de uma semente textual. */
function jitter(seed: string): number {
  return (hash32(seed) % 1000) / 1000
}

/** Índice do eixo de menor extensão: é a "espessura" da zona, logo sua normal. */
function thinnestAxis(b: Bounds): 0 | 1 | 2 {
  const size = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]]
  let axis: 0 | 1 | 2 = 0
  if (size[1] < size[axis]) axis = 1
  if (size[2] < size[axis]) axis = 2
  return axis
}

/** Face de saída dos pinos: declarada em `ZONE_PIN_FACE`, com fallback. */
function pinFace(zoneKey: string, b: Bounds): { axis: 0 | 1 | 2; sign: 1 | -1 } {
  return ZONE_PIN_FACE[zoneKey] ?? { axis: thinnestAxis(b), sign: 1 }
}

/**
 * Grade determinística (com leve jitter) de `count` pinos sobre a face visível
 * da zona, definida por `ZONE_PIN_FACE` (com fallback no eixo de menor
 * extensão, sentido positivo).
 */
export function pinPositionsForZone(zoneKey: string, count: number): [number, number, number][] {
  const b = zoneBounds(zoneKey)
  if (!b || count <= 0) return []

  const { axis: n, sign } = pinFace(zoneKey, b)
  const [u, v] = ([0, 1, 2] as const).filter((a) => a !== n) as [0 | 1 | 2, 0 | 1 | 2]

  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)

  const spanU = b.max[u] - b.min[u]
  const spanV = b.max[v] - b.min[v]
  // Margem interna para o pino não nascer exatamente na aresta da zona.
  const padU = Math.min(spanU * 0.18, 0.6)
  const padV = Math.min(spanV * 0.18, 0.6)

  const out: [number, number, number][] = []
  for (let i = 0; i < count; i += 1) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const fu = cols === 1 ? 0.5 : col / (cols - 1)
    const fv = rows === 1 ? 0.5 : row / (rows - 1)
    const ju = (jitter(`${zoneKey}:${i}:u`) - 0.5) * 0.22
    const jv = (jitter(`${zoneKey}:${i}:v`) - 0.5) * 0.22

    const pos: [number, number, number] = [0, 0, 0]
    pos[u] = b.min[u] + padU + clamp01(fu + ju) * Math.max(0, spanU - 2 * padU)
    pos[v] = b.min[v] + padV + clamp01(fv + jv) * Math.max(0, spanV - 2 * padV)
    pos[n] = sign === 1 ? b.max[n] + PIN_SURFACE_OFFSET : b.min[n] - PIN_SURFACE_OFFSET
    out.push(pos)
  }
  return out
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}
