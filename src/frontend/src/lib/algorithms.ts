/**
 * Rótulos das famílias de modelo (v1.1).
 *
 * Só nomes e formas de exibir. **O mapeamento área → algoritmo não está aqui**
 * nem em nenhum outro ponto do front: ele vem sempre de
 * `Metadata.area_algorithms` ou da própria resposta
 * (`PredictionResponse.algorithm_by_area` / `SensorPrediction.algorithm`).
 * Duplicá-lo faria a interface mentir assim que o manifesto mudasse.
 *
 * Como duas famílias convivem na mesma tela, a distinção é por RÓTULO
 * TEXTUAL, não por cor: a hierarquia de cor do projeto reserva saturação para
 * o dado térmico.
 */

import type { AlgorithmCode } from '@/contract/v1'

export const ALGORITHM_LABEL_PT: Record<AlgorithmCode, string> = {
  random_forest: 'Random Forest',
  gradient_boosting: 'Gradient Boosting',
}

/** Forma curta, para caber em célula de tabela e cabeçalho de cartão. */
export const ALGORITHM_SHORT_PT: Record<AlgorithmCode, string> = {
  random_forest: 'RF',
  gradient_boosting: 'GB',
}

export function algorithmLabel(code: AlgorithmCode | undefined): string {
  return code ? ALGORITHM_LABEL_PT[code] : '—'
}

export function algorithmShort(code: AlgorithmCode | undefined): string {
  return code ? ALGORITHM_SHORT_PT[code] : '—'
}
