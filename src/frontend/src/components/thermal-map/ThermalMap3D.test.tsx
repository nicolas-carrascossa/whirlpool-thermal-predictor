/**
 * `ThermalMap3D` sem WebGL: o `Canvas` vira um `div` e a cena é um stub que só
 * registra as props recebidas. Cobre o que a tela faz com a câmera e os
 * rótulos — "ir até a peça" e "Recentralizar" (reinício do mapa).
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

import type { PartFocus } from './cameraForPart'
import { DEFLECTOR } from './zoneGeometry'

interface SceneProps {
  thermalMode: boolean
  cameraPreset: string
  focus: PartFocus | null
  recenterToken: number
  resetToken: number
  showAnnotations: boolean
  selectedKeyArea: string | null
}

const { sceneProps } = vi.hoisted(() => ({ sceneProps: [] as SceneProps[] }))

vi.mock('@react-three/fiber', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@react-three/fiber')>()),
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
}))

vi.mock('./ThermalMapScene', () => ({
  ThermalMapScene: (props: SceneProps) => {
    sceneProps.push(props)
    return null
  },
}))

const { ThermalMap3D } = await import('./ThermalMap3D')

const last = () => sceneProps[sceneProps.length - 1]
const keyAreaLabels = Object.fromEntries(FIXTURE_METADATA.key_areas.map((a) => [a.name, a.label_pt]))

function renderMap(props: Partial<React.ComponentProps<typeof ThermalMap3D>> = {}) {
  return render(
    <ThermalMap3D predictions={FIXTURE_RESPONSE.predictions} keyAreaLabels={keyAreaLabels} {...props} />,
  )
}

function openFilters() {
  fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))
}

describe('ThermalMap3D — câmera e rótulos', () => {
  beforeEach(() => {
    sceneProps.length = 0
  })

  it('abre na câmera isométrica, sem foco em nenhuma peça e sem rótulos', () => {
    renderMap()
    expect(last()).toMatchObject({ cameraPreset: 'iso', focus: null, showAnnotations: false, thermalMode: false })
  })

  it('aplica o campo CFD somente no modo Mapa de calor', () => {
    const { rerender } = renderMap({ mode: 'status' })
    expect(last().thermalMode).toBe(false)

    rerender(
      <ThermalMap3D
        predictions={FIXTURE_RESPONSE.predictions}
        keyAreaLabels={keyAreaLabels}
        mode="absolute"
      />,
    )
    expect(last().thermalMode).toBe(true)
  })

  it('"ir até a peça" enquadra a região da peça, não só o preset', () => {
    renderMap({ focusRequest: { part: 'deflector', token: 1 } })
    const { focus, cameraPreset, recenterToken } = last()
    expect(cameraPreset).toBe('console')
    expect(recenterToken).toBeGreaterThan(0)
    expect(focus).not.toBeNull()
    expect(focus!.bounds.min[0]).toBeLessThan(DEFLECTOR.x)
    expect(focus!.bounds.max[0]).toBeGreaterThan(DEFLECTOR.x)
  })

  it('escolher um preset de câmera devolve o enquadramento do preset', () => {
    renderMap({ focusRequest: { part: 'deflector', token: 1 } })
    expect(last().focus).not.toBeNull()

    openFilters()
    fireEvent.click(screen.getByRole('button', { name: 'Frente' }))
    expect(last()).toMatchObject({ cameraPreset: 'front', focus: null })
  })

  it('Recentralizar reinicia o mapa: posição inicial e nenhum rótulo', () => {
    const onSelectKeyArea = vi.fn()
    renderMap({
      selectedKeyArea: 'IPC Comp',
      onSelectKeyArea,
      focusRequest: { part: 'deflector', token: 1 },
    })
    openFilters()
    fireEvent.click(screen.getByRole('button', { name: 'Traseira' }))
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(last().showAnnotations).toBe(true)

    const before = last()
    fireEvent.click(screen.getByRole('button', { name: 'Recentralizar' }))
    const after = last()

    // câmera: posição inicial, sem foco, e um novo pedido de enquadramento
    expect(after.cameraPreset).toBe('iso')
    expect(after.focus).toBeNull()
    expect(after.recenterToken).toBeGreaterThan(before.recenterToken)
    // rótulos: modo "Nenhum", área selecionada limpa, rótulo temporário da peça reiniciado
    expect(after.showAnnotations).toBe(false)
    expect(screen.getByRole('button', { name: 'Nenhum' })).toHaveAttribute('aria-pressed', 'true')
    expect(onSelectKeyArea).toHaveBeenCalledWith(null)
    expect(after.resetToken).toBeGreaterThan(before.resetToken)
  })

  it('depois de recentralizar, um novo clique na mesma peça volta a levar a câmera até ela', () => {
    const { rerender } = renderMap({ focusRequest: { part: 'blower', token: 1 } })
    openFilters()
    fireEvent.click(screen.getByRole('button', { name: 'Recentralizar' }))
    expect(last().focus).toBeNull()

    rerender(
      <ThermalMap3D
        predictions={FIXTURE_RESPONSE.predictions}
        keyAreaLabels={keyAreaLabels}
        focusRequest={{ part: 'blower', token: 2 }}
      />,
    )
    expect(last().focus).not.toBeNull()
  })
})
