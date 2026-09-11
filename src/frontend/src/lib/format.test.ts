import { describe, expect, it } from 'vitest'

import {
  formatCount,
  formatDateTime,
  formatMargin,
  formatNumber,
  formatPct,
  formatRatioPct,
  formatTemp,
} from '@/lib/format'

/** Normaliza espaços não separáveis para facilitar as asserções. */
const n = (s: string) => s.replace(/\u00A0/g, ' ')

describe('format (pt-BR)', () => {
  it('usa vírgula decimal e uma casa por padrão', () => {
    expect(formatNumber(83.44)).toBe('83,4')
    expect(formatNumber(1234.56, 2)).toBe('1.234,56')
  })

  it('formata temperatura com unidade', () => {
    expect(n(formatTemp(83.44))).toBe('83,4 °C')
    expect(n(formatTemp(150))).toBe('150,0 °C')
  })

  it('devolve travessão para valores ausentes ou inválidos', () => {
    expect(formatTemp(null)).toBe('—')
    expect(formatTemp(undefined)).toBe('—')
    expect(formatTemp(Number.NaN)).toBe('—')
    expect(formatRatioPct(null)).toBe('—')
    expect(formatMargin(null, null)).toBe('—')
  })

  it('formata percentual', () => {
    expect(n(formatPct(4.06))).toBe('4,1 %')
  })

  it('formata a margem de erro combinada', () => {
    expect(n(formatMargin(3.2, 4.1))).toBe('± 3,2 °C (4,1 %)')
  })

  it('formata a margem sem percentual quando ele falta', () => {
    expect(n(formatMargin(3.2, null))).toBe('± 3,2 °C')
  })

  it('converte razão em percentual', () => {
    expect(n(formatRatioPct(0.951))).toBe('95,1 %')
    expect(n(formatRatioPct(1.03))).toBe('103,0 %')
  })

  it('formata contagens como inteiros', () => {
    expect(formatCount(77)).toBe('77')
    expect(formatCount(1500)).toBe('1.500')
  })

  it('formata data/hora no padrão brasileiro', () => {
    expect(formatDateTime('2026-09-10T12:34:00Z')).toMatch(/^\d{2}\/\d{2}\/2026/)
    expect(formatDateTime('não é data')).toBe('—')
  })
})
