import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MapToolbar } from './MapToolbar'
import { DEFAULT_OPENINGS } from './StoveContext'

function renderToolbar(variant: 'panel' | 'overlay') {
  const onRecenter = vi.fn()
  render(
    <MapToolbar
      openings={DEFAULT_OPENINGS}
      onToggleOpening={() => {}}
      labelMode="none"
      onLabelModeChange={() => {}}
      view="solid"
      onViewChange={() => {}}
      cutDepth={50}
      onCutDepthChange={() => {}}
      explodeAmount={60}
      onExplodeAmountChange={() => {}}
      cameraPreset="iso"
      onCameraPresetChange={() => {}}
      onRecenter={onRecenter}
      variant={variant}
    />,
  )
  return { onRecenter }
}

describe('MapToolbar — Recentralizar', () => {
  it('na barra lateral é um botão escuro, único, acima do título "Filtros do mapa"', () => {
    const { onRecenter } = renderToolbar('panel')
    const buttons = screen.getAllByRole('button', { name: /recentralizar/i })
    expect(buttons).toHaveLength(1)
    const [button] = buttons
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground')

    const heading = screen.getByRole('heading', { name: 'Filtros do mapa' })
    expect(button.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(button)
    expect(onRecenter).toHaveBeenCalledTimes(1)
  })

  it('não repete o botão no grupo de câmera da barra lateral', () => {
    renderToolbar('panel')
    const camera = screen.getByRole('group', { name: 'Câmera' })
    expect(camera.textContent).not.toMatch(/recentralizar/i)
  })

  it('sobre o canvas (sem barra lateral) continua no grupo de câmera', () => {
    const { onRecenter } = renderToolbar('overlay')
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
    const camera = screen.getByRole('group', { name: 'Câmera' })
    const chip = screen.getByRole('button', { name: 'Recentralizar' })
    expect(camera).toContainElement(chip)
    fireEvent.click(chip)
    expect(onRecenter).toHaveBeenCalledTimes(1)
  })
})
