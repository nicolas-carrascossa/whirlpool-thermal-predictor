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
