import { afterEach, describe, expect, it, vi } from 'vitest'

/** O resultado é guardado por módulo: cada caso carrega uma cópia limpa. */
async function freshProbe() {
  vi.resetModules()
  return (await import('./webgl')).webglAvailable
}

describe('webglAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('é falso onde a interface WebGL nem existe (jsdom)', async () => {
    const webglAvailable = await freshProbe()
    expect(webglAvailable()).toBe(false)
  })

  it('é falso quando o navegador existe mas nega o contexto', async () => {
    vi.stubGlobal('WebGLRenderingContext', class {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const webglAvailable = await freshProbe()
    expect(webglAvailable()).toBe(false)
  })

  it('é falso se a sondagem lançar', async () => {
    vi.stubGlobal('WebGLRenderingContext', class {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const webglAvailable = await freshProbe()
    expect(webglAvailable()).toBe(false)
  })

  it('é verdadeiro com contexto, e devolve o contexto de teste na hora', async () => {
    const loseContext = vi.fn()
    vi.stubGlobal('WebGLRenderingContext', class {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as RenderingContext)
    const webglAvailable = await freshProbe()
    expect(webglAvailable()).toBe(true)
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  it('guarda a resposta: perguntar de novo não cria outro contexto', async () => {
    vi.stubGlobal('WebGLRenderingContext', class {})
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getExtension: () => null } as unknown as RenderingContext)
    const webglAvailable = await freshProbe()
    webglAvailable()
    webglAvailable()
    webglAvailable()
    expect(getContext).toHaveBeenCalledTimes(1)
  })
})
