/**
 * Formatação numérica pt-BR — fonte única de verdade dos números na interface.
 *
 * Regras: vírgula decimal, uma casa para temperaturas e percentuais, espaço
 * não separável antes da unidade (`83,4 °C`), e sempre `Intl.NumberFormat`
 * para que a localização não dependa do locale do navegador.
 */

const LOCALE = 'pt-BR'

/** Espaço não separável: evita quebra entre o número e a unidade. */
const NBSP = '\u00A0'

function nf(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Número puro com `digits` casas decimais (padrão 1). */
export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—'
  return nf(digits).format(value)
}

/** Temperatura: `83,4 °C`. */
export function formatTemp(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${nf(digits).format(value)}${NBSP}°C`
}

/** Percentual: `4,1 %`. */
export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${nf(digits).format(value)}${NBSP}%`
}

/** Margem de erro combinada: `± 3,2 °C (4,1 %)`. */
export function formatMargin(
  marginC: number | null | undefined,
  marginPct: number | null | undefined,
): string {
  if (marginC === null || marginC === undefined || !Number.isFinite(marginC)) return '—'
  const abs = `±${NBSP}${formatTemp(marginC)}`
  if (marginPct === null || marginPct === undefined || !Number.isFinite(marginPct)) return abs
  return `${abs} (${formatPct(marginPct)})`
}

/** Razão temp/limite como percentual: 0.951 → `95,1 %`. */
export function formatRatioPct(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—'
  return formatPct(ratio * 100, digits)
}

/** Inteiro localizado (contagens). */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(value)
}

/** Data/hora ISO → `10/09/2026 20:15`. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
