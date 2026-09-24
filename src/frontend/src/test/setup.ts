import { configure } from '@testing-library/react'

import '@testing-library/jest-dom/vitest'

// jsdom não implementa estas APIs de ponteiro/scroll; o Radix Select (usado
// no ConfigPanel) as chama ao abrir/fechar a lista de opções.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Contenção de máquina, não assincronia de aplicação: a suíte cria um jsdom por
// arquivo (26 no total, ~60% do tempo de execução), e sob essa carga o padrão de
// 1 s do `waitFor` estoura antes de o React terminar o commit. O sintoma é uma
// falha que muda de arquivo a cada execução e some quando o teste roda sozinho.
// 5 s não deixa passar bug de espera — um `waitFor` que dependa de rede ou de um
// estado que nunca chega continua falhando, só que sem o falso vermelho.
configure({ asyncUtilTimeout: 5000 })
