/**
 * Faixa de áreas sem WebGL: o canvas das figuras é um stub que só registra as
 * props recebidas, e a sondagem de WebGL é controlada pelo teste. Cobre o que a
 * faixa decide: figura 3D ou desenho de reserva, quem está em destaque e o que
 * acontece quando o canvas falha.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AreaFiguresCanvasProps } from '@/components/thermal-map/AreaFiguresCanvas'
import { groupByArea } from '@/features/results/ResultsPanel'
import { FIXTURE_METADATA, FIXTURE_RESPONSE } from '@/test/fixtures'

const stub = vi.hoisted(() => ({ webgl: true, canvasThrows: false, props: [] as AreaFiguresCanvasProps[] }))

vi.mock('@/lib/webgl', () => ({ webglAvailable: () => stub.webgl }))
vi.mock('@/components/thermal-map/AreaFiguresCanvas', () => ({
  default: (props: AreaFiguresCanvasProps) => {
    if (stub.canvasThrows) throw new Error('sem contexto WebGL')
    stub.props.push(props)
    return <div data-testid="figures-canvas" />
  },
}))

const { AreaStrip } = await import('./AreaStrip')

const AREAS = [
  ...FIXTURE_METADATA.key_areas.map(({ name, label_pt }) => ({ name, label_pt })),
  // uma área que a consulta não cobre: sem resultado
  { name: 'Coil Temps', label_pt: 'Resistência do forno' },
]
const GROUPS = groupByArea(FIXTURE_RESPONSE, FIXTURE_METADATA)
const lastPlacements = () => stub.props[stub.props.length - 1].placements
const placementOf = (area: string) => lastPlacements().find((p) => p.area === area)!

function renderStrip(selected: string | null = 'IPC Comp') {
  return render(<AreaStrip areas={AREAS} groups={GROUPS} selected={selected} onSelect={() => {}} />)
}

describe('AreaStrip — figuras 3D', () => {
  beforeEach(() => {
    stub.webgl = true
    stub.canvasThrows = false
    stub.props.length = 0
  })

  it('reserva um quadrado por área e leva as figuras a um único canvas', async () => {
    const { container } = renderStrip()
    await screen.findByTestId('figures-canvas')

    expect(container.querySelectorAll('[data-area-figure-slot]')).toHaveLength(AREAS.length)
    expect(screen.getAllByTestId('figures-canvas')).toHaveLength(1)
    expect(container.querySelector('[data-area-thumb]')).toBeNull()
    expect(lastPlacements().map((p) => p.area)).toEqual(AREAS.map((a) => a.name))
  })

  it('as figuras não carregam o status: a coloração é a mesma em qualquer área', async () => {
    renderStrip()
    await screen.findByTestId('figures-canvas')

    // IPC Comp excede o limite, CT Knobs está dentro, Main Vent Sys só tem monitoramento e
    // Coil Temps não tem resultado — e nada disso chega ao canvas como cor
    for (const placement of lastPlacements()) {
      expect(Object.keys(placement).sort()).toEqual(['active', 'area', 'cx', 'cy', 'size', 'tileWidth'])
    }
  })

  it('área sem resultado na consulta nunca fica em destaque', async () => {
    renderStrip('Coil Temps')
    await screen.findByTestId('figures-canvas')

    expect(placementOf('Coil Temps').active).toBe(false)
  })

  it('a área selecionada fica em destaque, e passar o mouse destaca a que está sob ele', async () => {
    renderStrip('IPC Comp')
    await screen.findByTestId('figures-canvas')
    expect(placementOf('IPC Comp').active).toBe(true)
    expect(placementOf('CT Knobs').active).toBe(false)

    const knobs = screen.getByRole('button', { name: /Botões do cooktop/ })
    fireEvent.mouseEnter(knobs)
    await waitFor(() => expect(placementOf('CT Knobs').active).toBe(true))
    expect(placementOf('IPC Comp').active).toBe(true)

    fireEvent.mouseLeave(knobs)
    await waitFor(() => expect(placementOf('CT Knobs').active).toBe(false))
  })

  it('o foco por teclado também destaca a área', async () => {
    renderStrip('IPC Comp')
    await screen.findByTestId('figures-canvas')
    const vent = screen.getByRole('button', { name: /Ventilação principal/ })
    fireEvent.focus(vent)
    await waitFor(() => expect(placementOf('Main Vent Sys').active).toBe(true))
    fireEvent.blur(vent)
    await waitFor(() => expect(placementOf('Main Vent Sys').active).toBe(false))
  })

  it('os cartões continuam sendo botões com nome, estado e porcentagem', async () => {
    renderStrip('IPC Comp')
    await screen.findByTestId('figures-canvas')
    expect(screen.getByRole('button', { name: /Compartimento da eletrônica de potência/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /Resistência do forno/ })).toBeDisabled()
  })
})

describe('AreaStrip — desenho de reserva', () => {
  beforeEach(() => {
    stub.webgl = true
    stub.canvasThrows = false
    stub.props.length = 0
  })

  it('sem WebGL, mostra o desenho em CSS e não carrega o canvas', () => {
    stub.webgl = false
    const { container } = renderStrip()

    expect(container.querySelectorAll('[data-area-thumb]')).toHaveLength(AREAS.length)
    expect(container.querySelector('[data-area-figure-slot]')).toBeNull()
    expect(screen.queryByTestId('figures-canvas')).not.toBeInTheDocument()
  })

  it('se o canvas falhar, a faixa volta ao desenho em CSS sem perder os cartões', async () => {
    stub.canvasThrows = true
    // O erro é proposital: o React o repassa ao `window` e ao `console`; nenhum dos dois deve poluir o relatório.
    const swallow = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', swallow)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { container } = renderStrip()

      await waitFor(() => expect(container.querySelectorAll('[data-area-thumb]')).toHaveLength(AREAS.length))
      expect(container.querySelector('[data-area-figure-slot]')).toBeNull()
      expect(screen.getAllByRole('button')).toHaveLength(AREAS.length)
    } finally {
      window.removeEventListener('error', swallow)
      spy.mockRestore()
    }
  })
})
