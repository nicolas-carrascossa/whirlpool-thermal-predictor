/**
 * Gera `src/contracts/api_v1.schema.json` (JSON Schema draft 2020-12) a partir de
 * `src/contract/v1.ts`. Reprodutível: rodar de novo sem mudar os tipos produz
 * um arquivo byte a byte idêntico.
 *
 *   npm run contract:schema
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createGenerator } from 'ts-json-schema-generator'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '..')
const repoRoot = resolve(frontendRoot, '../..')

const ROOT_TYPES = ['PredictionRequest', 'PredictionResponse', 'Metadata', 'MetricsResponse']

const generator = createGenerator({
  path: resolve(frontendRoot, 'src/contract/v1.ts'),
  tsconfig: resolve(frontendRoot, 'tsconfig.app.json'),
  type: '*',
  expose: 'export',
  topRef: true,
  jsDoc: 'extended',
  skipTypeCheck: true,
  additionalProperties: false,
})

/** Renomeia `definitions` -> `$defs` (vocabulário 2020-12). */
function rewriteRefs(node) {
  if (Array.isArray(node)) return node.map(rewriteRefs)
  if (node && typeof node === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(node)) {
      out[key] =
        key === '$ref' && typeof value === 'string'
          ? value.replace('#/definitions/', '#/$defs/')
          : rewriteRefs(value)
    }
    return out
  }
  return node
}

/** Ordena chaves recursivamente para tornar a saída estável. */
function sortKeys(node) {
  if (Array.isArray(node)) return node.map(sortKeys)
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.keys(node)
        .sort()
        .map((k) => [k, sortKeys(node[k])]),
    )
  }
  return node
}

const defs = {}
for (const type of ROOT_TYPES) {
  const schema = generator.createSchema(type)
  Object.assign(defs, schema.definitions ?? {})
}

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://inteli.whirlpool/thermal-predictor/contracts/api_v1.schema.json',
  title: 'Thermal Predictor — contrato da API v1',
  description:
    'Gerado por npm run contract:schema a partir de src/frontend/src/contract/v1.ts. Não editar à mão.',
  oneOf: ROOT_TYPES.map((t) => ({ $ref: `#/$defs/${t}` })),
  $defs: sortKeys(rewriteRefs(defs)),
}

const outFile = resolve(repoRoot, 'src/contracts/api_v1.schema.json')
writeFileSync(outFile, `${JSON.stringify(schema, null, 2)}\n`, 'utf8')
console.log(`src/contracts/api_v1.schema.json escrito com ${Object.keys(defs).length} definições.`)
