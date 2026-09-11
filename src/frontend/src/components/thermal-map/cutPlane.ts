/**
 * Plano de corte do modo "Corte" (agora sob o disclosure "Avançado" da barra).
 * Vive fora de `ThermalMapScene` para que `StoveBody` possa desenhar a tampa
 * escura da face cortada sem criar dependência circular.
 */

/** Z do plano de corte para `cutDepth` 0…100 (%). Tudo com z > este valor é removido. */
export function cutZForDepth(depth: number): number {
  const t = Math.min(100, Math.max(0, depth)) / 100
  return 11 + (-9.2 - 11) * t
}

/** Profundidade inicial do corte: mostra o interior do console e a cavidade. */
export const DEFAULT_CUT_DEPTH = 75
