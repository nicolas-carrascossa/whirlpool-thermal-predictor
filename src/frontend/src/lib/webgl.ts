let cached: boolean | undefined

/**
 * O navegador consegue criar um contexto WebGL? Decide se uma tela mostra uma
 * figura 3D ou o desenho de reserva. Só uma sondagem leve: o contexto de teste é
 * descartado na hora, para não gastar um dos poucos que o navegador permite.
 * O resultado fica guardado — a pergunta não muda durante a sessão.
 */
export function webglAvailable(): boolean {
  if (cached !== undefined) return cached
  cached = probe()
  return cached
}

function probe(): boolean {
  // jsdom e navegadores sem WebGL não definem a interface: nem tenta o canvas.
  if (typeof window === 'undefined' || typeof window.WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
