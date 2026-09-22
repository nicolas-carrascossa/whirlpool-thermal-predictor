import { describe, expect, it } from 'vitest'

import type { StoveConfig } from '@/contract/v1'

import { ovenBadgeText } from './ovenBadge'
import { FALLBACK_CONFIG } from './parts'

function withRunCase(run_case: string): StoveConfig {
  return { ...FALLBACK_CONFIG, run_case }
}

describe('ovenBadgeText', () => {
  it('Pyro: forno a 400 °C e cooktop desligado', () => {
    expect(ovenBadgeText(withRunCase('Pyro'))).toBe('Forno 400 °C · cooktop desligado')
  })

  it('Broil C2: chapa e duas panelas', () => {
    expect(ovenBadgeText(withRunCase('Broil C2'))).toBe(
      'Forno 280 °C · cooktop ligado (chapa + 2 panelas)',
    )
  })

  it('Broil Qualitative: quatro panelas', () => {
    expect(ovenBadgeText(withRunCase('Broil Qualitative'))).toBe(
      'Forno 280 °C · cooktop ligado (4 panelas)',
    )
  })

  it('Broil C1: chapa e três panelas', () => {
    expect(ovenBadgeText(withRunCase('Broil C1'))).toBe(
      'Forno 280 °C · cooktop ligado (chapa + 3 panelas)',
    )
  })

  it('run_case desconhecido cai no padrão de 280 °C com cooktop desligado', () => {
    expect(ovenBadgeText(withRunCase('Outro'))).toBe('Forno 280 °C · cooktop desligado')
  })
})
