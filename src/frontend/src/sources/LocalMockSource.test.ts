import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'

import { ContractError, type PredictionResponse, type StoveConfig } from '@/contract/v1'
import registryJson from '@data/sensor_registry.json'
import variableOptionsJson from '@data/variable_options.json'

import {
  CONFIG_FIELDS,
  LocalMockSource,
  REFERENCE_CONFIG,
  areaMultiplier,
  computeReliability,
  mulberry32,
} from './LocalMockSource'

// --- schema ---------------------------------------------------------------

const schema = JSON.parse(
  // vitest roda com cwd em src/frontend
  readFileSync(resolve(process.cwd(), '../contracts/api_v1.schema.json'), 'utf8'),
) as { $id: string }

const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
ajv.addSchema(schema)

const validateResponse = ajv.getSchema(`${schema.$id}#/$defs/PredictionResponse`)!
const validateMetadata = ajv.getSchema(`${schema.$id}#/$defs/Metadata`)!
const validateRequest = ajv.getSchema(`${schema.$id}#/$defs/PredictionRequest`)!

// --- helpers --------------------------------------------------------------

const options = variableOptionsJson as unknown as Record<string, { options: string[] }>
const sensors = registryJson as Array<{ tc_number: number; key_area: string; is_monitor: boolean }>

const FIXED_NOW = new Date('2026-09-10T12:00:00.000Z')
const source = new LocalMockSource({ now: () => FIXED_NOW })

function meanTemp(res: PredictionResponse, keyArea?: string): number {
  const rows = keyArea ? res.predictions.filter((p) => p.key_area === keyArea) : res.predictions
  expect(rows.length).toBeGreaterThan(0)
  return rows.reduce((acc, p) => acc + p.temp_c, 0) / rows.length
}

async function predictWith(patch: Partial<StoveConfig>): Promise<PredictionResponse> {
  return source.predict({ architecture: 'BR', config: { ...REFERENCE_CONFIG, ...patch } })
}

// --- (a) schema -----------------------------------------------------------

describe('contrato', () => {
  it('valida 50 configs aleatórias contra o JSON Schema', async () => {
    const rand = mulberry32(20260910)
    for (let i = 0; i < 50; i += 1) {
      const config = Object.fromEntries(
        CONFIG_FIELDS.map((f) => {
          const opts = options[f].options
          return [f, opts[Math.floor(rand() * opts.length)]]
        }),
      ) as unknown as StoveConfig

      const req = { architecture: 'BR' as const, config }
      expect(validateRequest(req), JSON.stringify(validateRequest.errors)).toBe(true)

      const res = await source.predict(req)
      expect(validateResponse(res), JSON.stringify(validateResponse.errors)).toBe(true)
      expect(res.predictions).toHaveLength(77)
    }
  })

  it('metadata valida contra o schema e descreve 7 variáveis, 7 áreas e 77 sensores', async () => {
    const meta = await source.getMetadata()
    expect(validateMetadata(meta), JSON.stringify(validateMetadata.errors)).toBe(true)
    expect(meta.contract_version).toBe('1.2.0')
    expect(meta.variables).toHaveLength(7)
    expect(meta.key_areas).toHaveLength(7)
    expect(meta.sensors).toHaveLength(77)
    expect(meta.key_areas.reduce((a, k) => a + k.n_sensors, 0)).toBe(77)
    expect(
      meta.variables.filter((v) => !v.used_by_model).map((v) => v.name).sort(),
    ).toEqual(['board_position', 'losses'])
    expect(meta.variables.every((v) => v.label_pt.length > 0 && v.help_pt.length > 20)).toBe(true)
    expect(meta.architectures).toEqual([
      { code: 'BR', available: true, label_pt: 'Brasil' },
      { code: 'MX', available: false, label_pt: 'México (sem dados de treino)' },
    ])
  })
})

// --- (b) determinismo -----------------------------------------------------

describe('determinismo', () => {
  it('mesma requisição produz resposta idêntica', async () => {
    const a = await predictWith({})
    const b = await predictWith({})
    expect(a).toEqual(b)
  })

  it('instâncias diferentes produzem as mesmas predições', async () => {
    const other = new LocalMockSource({ now: () => new Date('2020-01-01T00:00:00.000Z') })
    const a = await predictWith({})
    const b = await other.predict({ architecture: 'BR', config: REFERENCE_CONFIG })
    expect(b.predictions).toEqual(a.predictions)
    expect(b.request_id).toBe(a.request_id)
  })
})

// --- (c) H3 ---------------------------------------------------------------

describe('hipóteses', () => {
  it('H3: Broil C2 é mais quente que Pyro na média dos sensores', async () => {
    const broil = await predictWith({ run_case: 'Broil C2' })
    const pyro = await predictWith({ run_case: 'Pyro' })
    expect(meanTemp(broil)).toBeGreaterThan(meanTemp(pyro))
  })

  // --- (d) H4 -------------------------------------------------------------
  it('H4: housing Open aquece o IPC Comp em relação a Closed', async () => {
    const open = await predictWith({ housing: 'Open' })
    const closed = await predictWith({ housing: 'Closed' })
    expect(meanTemp(open, 'IPC Comp')).toBeGreaterThan(meanTemp(closed, 'IPC Comp'))
  })

  // --- (e) H1 -------------------------------------------------------------
  it('H1: deflector_hole Open aquece IPC Comp e resfria Main Vent Sys (documentacao §H1)', async () => {
    const open = await predictWith({ deflector_hole: 'Open' })
    const closed = await predictWith({ deflector_hole: 'Closed' })
    const deltaVent = meanTemp(open, 'Main Vent Sys') - meanTemp(closed, 'Main Vent Sys')
    const deltaIpc = meanTemp(open, 'IPC Comp') - meanTemp(closed, 'IPC Comp')
    expect(deltaIpc).toBeGreaterThan(0)
    expect(deltaVent).toBeLessThan(0)
    expect(Math.sign(deltaVent)).not.toBe(Math.sign(deltaIpc))
  })

  it('H1: blower_direction To back piora IPC Comp e IPC Cooling sem aliviar outras áreas', async () => {
    const back = await predictWith({ blower_direction: 'To back' })
    const front = await predictWith({ blower_direction: 'To front' })
    expect(meanTemp(back, 'IPC Comp')).toBeGreaterThan(meanTemp(front, 'IPC Comp'))
    expect(meanTemp(back, 'IPC Cooling')).toBeGreaterThan(meanTemp(front, 'IPC Cooling'))
    // sem ruído: o multiplicador nunca pode ser menor com "To back" em nenhuma área
    const backCfg = { ...REFERENCE_CONFIG, blower_direction: 'To back' }
    const frontCfg = { ...REFERENCE_CONFIG, blower_direction: 'To front' }
    for (const area of ['Mainback', 'Main Vent Sys', 'CT Knobs', 'Oven HMI', 'Coil Temps']) {
      expect(areaMultiplier(backCfg, area)).toBeGreaterThanOrEqual(areaMultiplier(frontCfg, area))
    }
  })

  // --- (f) H2 -------------------------------------------------------------
  it('H2: losses e board_position não alteram a predição', async () => {
    const base = await predictWith({})
    const other = await predictWith({ losses: 'Simone Losses', board_position: 'Right' })
    expect(other.predictions).toEqual(base.predictions)
    expect(base.ignored_fields).toEqual(['losses', 'board_position'])
  })
})

// --- (g) confiabilidade ---------------------------------------------------

describe('confiabilidade', () => {
  it('config de referência é interpolação', () => {
    const r = computeReliability(REFERENCE_CONFIG)
    expect(r.distance).toBe(0)
    expect(r.reliability).toBe('interpolation')
  })

  it('uma variável do modelo diferente é extrapolação moderada', () => {
    const r = computeReliability({ ...REFERENCE_CONFIG, material_coil_support: 'Plastic' })
    expect(r.distance).toBe(1)
    expect(r.reliability).toBe('moderate_extrapolation')
  })

  it('três variáveis diferentes caem fora do domínio', () => {
    const r = computeReliability({
      ...REFERENCE_CONFIG,
      blower_direction: 'To back',
      deflector_hole: 'Open',
      material_coil_support: 'Plastic',
    })
    expect(r.distance).toBeGreaterThanOrEqual(2)
    expect(r.reliability).toBe('out_of_domain')
  })

  it('a confiabilidade aparece em todas as predições', async () => {
    const res = await predictWith({})
    expect(res.predictions.every((p) => p.reliability === 'interpolation')).toBe(true)
  })
})

// --- (h) MX ---------------------------------------------------------------

describe('arquiteturas e validação', () => {
  it('MX responde sem predições e marcado como indisponível', async () => {
    const res = await source.predict({ architecture: 'MX', config: REFERENCE_CONFIG })
    expect(res.architecture_available).toBe(false)
    expect(res.predictions).toEqual([])
    expect(res.model_version).toBe('mock-0.1.0')
    expect(validateResponse(res), JSON.stringify(validateResponse.errors)).toBe(true)
  })

  // --- (i) ----------------------------------------------------------------
  it('opção inválida lança ContractError com mensagem em português', async () => {
    await expect(
      source.predict({
        architecture: 'BR',
        config: { ...REFERENCE_CONFIG, housing: 'Aberta' },
      }),
    ).rejects.toBeInstanceOf(ContractError)

    await source
      .predict({ architecture: 'BR', config: { ...REFERENCE_CONFIG, housing: 'Aberta' } })
      .catch((err: ContractError) => {
        expect(err.field).toBe('housing')
        expect(err.message).toContain('Valor inválido para "housing"')
        expect(err.message).toContain('Valores aceitos')
      })

    await expect(
      source.predict({
        architecture: 'AR' as never,
        config: REFERENCE_CONFIG,
      }),
    ).rejects.toBeInstanceOf(ContractError)
  })
})

// --- (j) monitores --------------------------------------------------------

describe('sensores e alvos', () => {
  it('sensores de monitoramento não têm limite nem excedência', async () => {
    const res = await predictWith({})
    const monitors = res.predictions.filter((p) => p.is_monitor)
    expect(monitors).toHaveLength(9)
    for (const m of monitors) {
      expect(m.active_limit_c).toBeNull()
      expect(m.limit_ratio).toBeNull()
      expect(m.exceeds_limit).toBe(false)
    }
    for (const p of res.predictions.filter((x) => !x.is_monitor)) {
      expect(typeof p.active_limit_c).toBe('number')
      expect(p.limit_ratio).toBeCloseTo(p.temp_c / (p.active_limit_c as number), 1)
      expect(p.exceeds_limit).toBe(p.temp_c > (p.active_limit_c as number))
    }
  })

  // --- (k) ----------------------------------------------------------------
  it('filtro por key_area devolve apenas aquela área, com os mesmos valores', async () => {
    const all = await predictWith({})
    const expected = sensors.filter((s) => s.key_area === 'IPC Comp').length
    const filtered = await source.predict({
      architecture: 'BR',
      config: REFERENCE_CONFIG,
      targets: { key_areas: ['IPC Comp'] },
    })
    expect(filtered.predictions).toHaveLength(expected)
    expect(filtered.predictions.every((p) => p.key_area === 'IPC Comp')).toBe(true)
    expect(filtered.predictions).toEqual(all.predictions.filter((p) => p.key_area === 'IPC Comp'))
  })

  it('filtro por tc_number devolve apenas os sensores pedidos', async () => {
    const res = await source.predict({
      architecture: 'BR',
      config: REFERENCE_CONFIG,
      targets: { sensors: [1, 34] },
    })
    expect(res.predictions.map((p) => p.tc_number)).toEqual([1, 34])
  })

  it('margem de erro é sempre de pelo menos 1 °C e coerente em %', async () => {
    const res = await predictWith({})
    for (const p of res.predictions) {
      expect(p.error_margin_c).toBeGreaterThanOrEqual(1)
      expect(p.error_margin_pct).toBeCloseTo((p.error_margin_c / p.temp_c) * 100, 1)
    }
  })
})
