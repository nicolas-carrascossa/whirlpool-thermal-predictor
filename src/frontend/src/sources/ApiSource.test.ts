/**
 * `ApiSource`: Bearer attach, parsing feliz, 401 -> AuthError + logout, 422 ->
 * ContractError com o detail da API. `fetch` é mockado com `vi.stubGlobal`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthError } from '@/contract/errors'
import { ContractError, type PredictionRequest } from '@/contract/v1'
import { clearSession, setSession } from '@/features/auth/tokenStore'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

import { ApiSource } from './ApiSource'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const REQUEST: PredictionRequest = {
  architecture: 'BR',
  config: {
    blower_direction: 'To front',
    housing: 'Closed',
    board_position: 'Center',
    run_case: 'Pyro',
    losses: 'No losses',
    deflector_hole: 'Closed',
    material_coil_support: 'Aluminium',
  },
}

describe('ApiSource', () => {
  beforeEach(() => {
    clearSession()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearSession()
  })

  it('busca metadata sem token quando não há sessão', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(FIXTURE_METADATA))
    vi.stubGlobal('fetch', fetchMock)

    const source = new ApiSource()
    const metadata = await source.getMetadata()

    expect(metadata).toEqual(FIXTURE_METADATA)
    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('anexa o Bearer token e faz parse da predição', async () => {
    setSession({
      token: 'tok-123',
      expiresAt: Date.now() + 60_000,
      user: { username: 'engenheiro', display_name: 'Engenheiro', role: 'engineer' },
    })
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(FIXTURE_RESPONSE))
    vi.stubGlobal('fetch', fetchMock)

    const source = new ApiSource()
    const result = await source.predict(REQUEST)

    expect(result).toEqual(FIXTURE_RESPONSE)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://localhost:8000/api/v1/predictions')
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer tok-123')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(REQUEST)
  })

  it('401 lança AuthError e limpa a sessão', async () => {
    setSession({
      token: 'expired',
      expiresAt: Date.now() + 60_000,
      user: { username: 'engenheiro', display_name: 'Engenheiro', role: 'engineer' },
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Não autenticado' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    const source = new ApiSource()
    await expect(source.predict(REQUEST)).rejects.toBeInstanceOf(AuthError)

    const { getSession } = await import('@/features/auth/tokenStore')
    expect(getSession()).toBeNull()
  })

  it('422 lança ContractError com o detail pt-BR da API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ detail: 'Valor inválido para "housing": "Foo".' }, 422),
      )
    vi.stubGlobal('fetch', fetchMock)

    const source = new ApiSource()
    await expect(source.predict(REQUEST)).rejects.toMatchObject({
      name: 'ContractError',
      message: 'Valor inválido para "housing": "Foo".',
    })
    await expect(source.predict(REQUEST)).rejects.toBeInstanceOf(ContractError)
  })

  it('erro de rede vira ContractError genérico', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    const source = new ApiSource()
    await expect(source.getMetadata()).rejects.toMatchObject({
      name: 'ContractError',
      message: 'Não foi possível contactar a API',
      field: 'network',
    })
  })
})
