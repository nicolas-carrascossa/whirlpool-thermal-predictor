/**
 * Invariante de arquitetura (v1.1): o mapeamento área → algoritmo é servido
 * pelo back-end e **não pode aparecer escrito à mão em componente nenhum**.
 *
 * Trocar o algoritmo de uma área é edição de configuração (reexportar o
 * manifesto), não deploy de interface. Uma cópia do mapa no front faria a tela
 * mentir no instante seguinte à troca — e mentir de forma silenciosa, que é o
 * pior modo.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import manifest from '@data/model_manifest.json'
import { LocalMockSource } from '@/sources/LocalMockSource'

const SRC = resolve(process.cwd(), 'src')

/** As 7 áreas reais, como aparecem em `key_area`. */
const KEY_AREAS = Object.keys(manifest.area_algorithms)

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path))
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(path)
    }
  }
  return out
}

/**
 * Arquivos autorizados a nomear um algoritmo junto de uma área: o contrato
 * (que define o enum), a tabela de rótulos, o mock local (substituto do
 * back-end, que lê o mapa do manifesto), o modelo de métricas (objeto
 * sintético) e a fixture de teste.
 */
const ALLOWED = [
  join('src', 'contract', 'v1.ts'),
  join('src', 'lib', 'algorithms.ts'),
  join('src', 'sources', 'LocalMockSource.ts'),
  join('src', 'features', 'metrics', 'metricsModel.ts'),
  // Fixture de teste: precisa de um mapa fixo para as 3 áreas que simula.
  join('src', 'test', 'fixtures.ts'),
]

describe('procedência do modelo', () => {
  it('nenhum componente associa uma key_area a um algoritmo', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      const relative = file.slice(resolve(process.cwd()).length + 1)
      if (ALLOWED.some((allowed) => relative.endsWith(allowed))) continue
      const text = readFileSync(file, 'utf8')
      // Um arquivo só é suspeito se citar um algoritmo E uma área na mesma
      // linha: é assim que um mapa escrito à mão se parece.
      for (const line of text.split('\n')) {
        const namesAlgorithm = /random_forest|gradient_boosting/.test(line)
        const namesArea = KEY_AREAS.some((area) => line.includes(`'${area}'`) || line.includes(`"${area}"`))
        if (namesAlgorithm && namesArea) offenders.push(`${relative}: ${line.trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('o mock ecoa o mapa do manifesto, sem inventar o seu', async () => {
    const metadata = await new LocalMockSource().getMetadata()
    expect(metadata.area_algorithms).toEqual(manifest.area_algorithms)
    expect(Object.keys(metadata.area_algorithms)).toHaveLength(7)
  })

  it('cada predição do mock carrega o algoritmo da sua área', async () => {
    const source = new LocalMockSource()
    const metadata = await source.getMetadata()
    const response = await source.predict({
      architecture: 'BR',
      config: metadata.reference_config,
    })
    expect(response.predictions.length).toBeGreaterThan(0)
    for (const prediction of response.predictions) {
      expect(prediction.algorithm).toBe(metadata.area_algorithms[prediction.key_area])
    }
    // O mapa de conveniência tem de concordar com as predições.
    for (const [area, algorithm] of Object.entries(response.algorithm_by_area)) {
      expect(algorithm).toBe(metadata.area_algorithms[area])
    }
  })
})
