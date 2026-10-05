/**
 * Escalas de cor do mapa térmico 3D.
 *
 * Escala absoluta: azul → amarelo → laranja → vermelho, conforme a exceção de
 * codificação de dados definida em `documents/plano_frontend.md` (seção 1):
 * `#00a0dd → #eeb111 → #e08650 → #b3261e`. Os pontos de parada em t=0/0.35/0.68/1
 * reproduzem os mesmos t do protótipo original (só as cores mudaram).
 *
 * Zona sem sensores selecionados: cinza `--wp-gray-20` (#d1d3d4).
 */

export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(rgb: RGB): string {
  return (
    '#' +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function lerpRgb(a: RGB, b: RGB, f: number): RGB {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

/** Cinza de zona sem sensores selecionados (`--wp-gray-20`). */
export const ZONE_GRAY_HEX = '#d1d3d4'

const HEAT_STOPS: { t: number; c: RGB }[] = [
  { t: 0.0, c: hexToRgb('#00a0dd') },
  { t: 0.35, c: hexToRgb('#eeb111') },
  { t: 0.68, c: hexToRgb('#e08650') },
  { t: 1.0, c: hexToRgb('#b3261e') },
]

/** Interpola a escala de calor absoluta em `tNorm` (0..1), clampando fora do intervalo. */
export function heatColorRgb(tNorm: number): RGB {
  const t = Math.max(0, Math.min(1, tNorm))
  for (let i = 0; i < HEAT_STOPS.length - 1; i += 1) {
    const a = HEAT_STOPS[i]
    const b = HEAT_STOPS[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1)
      return lerpRgb(a.c, b.c, f)
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1].c
}

export function heatColorHex(tNorm: number): string {
  return rgbToHex(heatColorRgb(tNorm))
}

/** Cor de uma zona no modo absoluto, normalizada entre `min` e `max` da consulta atual. */
export function heatColorForValue(value: number, min: number, max: number): string {
  const t = (value - min) / (max - min || 1)
  return heatColorHex(t)
}

