/**
 * Exportador da fixture de paridade TS ↔ Python (Fase 2).
 *
 * Não é um teste de comportamento: é o gerador de `contracts/fixtures/
 * mock_parity_v1.json`, o alvo que `src/backend/tests/test_parity.py` usa para
 * provar que o mock portado para Python devolve exatamente os mesmos números
 * que o mock do navegador.
 *
 * Roda apenas sob demanda, para não escrever arquivos em CI:
 *   $env:EXPORT_PARITY='1'; npx vitest run src/sources/exportParityFixture.test.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { PredictionRequest, StoveConfig } from '@/contract/v1'

import { LocalMockSource, REFERENCE_CONFIG } from './LocalMockSource'

const ENABLED = process.env.EXPORT_PARITY === '1'
const OUT = resolve(process.cwd(), '../../contracts/fixtures/mock_parity_v1.json')
const FIXED_NOW = new Date('2026-09-10T12:00:00.000Z')

function cfg(patch: Partial<StoveConfig>): StoveConfig {
  return { ...REFERENCE_CONFIG, ...patch }
}

/** 25 configurações determinísticas: referência, variações sistemáticas de
 *  1 e 2 variáveis, dois casos MX e três recortes por alvos. */
function buildRequests(): PredictionRequest[] {
  const single: Array<Partial<StoveConfig>> = [
    { run_case: 'Pyro' },
    { run_case: 'Broil C1' },
    { run_case: 'Broil C2' },
    { run_case: 'Broil Qualitative' },
    { housing: 'Closed' },
    { housing: 'Open' },
    { housing: 'Open - Updated' },
    { blower_direction: 'To back' },
    { blower_direction: 'To front' },
    { deflector_hole: 'Open' },
    { deflector_hole: 'Closed' },
    { material_coil_support: 'Plastic' },
    { material_coil_support: 'Aluminium Plate' },
    // campos ignorados pelo modelo (H2): mudam o request_id, não as predições
    { losses: 'Simone Losses' },
    { board_position: 'Right' },
  ]
  const double: Array<Partial<StoveConfig>> = [
    { housing: 'Open', deflector_hole: 'Open' },
    { housing: 'Closed', blower_direction: 'To back' },
    { run_case: 'Pyro', material_coil_support: 'Plastic' },
    { run_case: 'Broil C2', housing: 'Open - Updated' },
    { deflector_hole: 'Open', material_coil_support: 'Aluminium Plate' },
  ]

  const requests: PredictionRequest[] = [
    { architecture: 'BR', config: cfg({}) },
    ...single.map((patch) => ({ architecture: 'BR' as const, config: cfg(patch) })),
    ...double.map((patch) => ({ architecture: 'BR' as const, config: cfg(patch) })),
    // MX: indisponível, com e sem alvos
    { architecture: 'MX', config: cfg({}) },
    { architecture: 'MX', config: cfg({ housing: 'Open' }), targets: { key_areas: ['IPC Comp'] } },
    // recortes
    {
      architecture: 'BR',
      config: cfg({}),
      targets: { key_areas: ['IPC Comp', 'Coil Temps'] },
    },
    {
      architecture: 'BR',
      config: cfg({ housing: 'Open' }),
      targets: { sensors: [1, 12, 34, 77] },
    },
  ]
  return requests
}

describe('fixture de paridade', () => {
  const run = ENABLED ? it : it.skip

  run('exporta 25 pares request/response para contracts/fixtures', async () => {
    const source = new LocalMockSource({ now: () => FIXED_NOW })
    const requests = buildRequests()
    expect(requests).toHaveLength(25)

    const pairs = []
    for (const request of requests) {
      pairs.push({ request, response: await source.predict(request) })
    }

    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(OUT, `${JSON.stringify(pairs, null, 2)}\n`, 'utf8')
    expect(pairs).toHaveLength(25)
  })
})
