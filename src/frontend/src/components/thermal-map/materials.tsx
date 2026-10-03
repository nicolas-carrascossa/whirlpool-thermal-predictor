/**
 * Materiais do fogão. As cores são espelhadas de `src/styles/tokens.css` —
 * three.js não lê CSS variables.
 */
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { useStove } from './StoveContext'

/**
 * Fase 1d, etapa B — hierarquia de cor: **o dado é a única cor saturada**.
 * Todo o cenário (corpo, peças, setas, placa) vive em neutros do style guide;
 * `--wp-accent` aparece só na peça em foco e as cores de status/calor só nas
 * zonas, nos pinos e nos rótulos.
 */
export const C = {
  bodyLight: '#f5f6f7', // --wp-gray-05
  bodyMid: '#dee0e3', // --wp-gray-12
  divider: '#d1d3d4', // --wp-gray-20
  edge: '#9fa0a1', // --wp-gray-45
  gray45: '#9fa0a1', // --wp-gray-45
  gray65: '#767777', // --wp-gray-65
  dark: '#484949', // --wp-gray-85
  glass: '#23262a',
  accent: '#94a3b8', // --wp-accent
  core: '#0d436b', // --wp-core
  metal: '#9fa0a1', // metálico claro (neutro)
  metalDark: '#767777', // metálico escuro (neutro)
  pcb: '#4a5a50', // verde-acinzentado dessaturado: a placa não compete com o dado
  ember: '#ff5b1f',
  /** Tinta quente e discreta do fundo da cavidade (emissivo ≤ 0,25). */
  ovenTint: '#b08a63',
  // Acabamentos do produto real (range elétrica de 30"), todos neutros:
  /** Inox escovado dos painéis externos. */
  steel: '#b4b7ba',
  /** Inox mais escuro: molduras, trim do cooktop, bezels dos botões. */
  steelDark: '#8e9194',
  /** Grafite da faixa de comando do console. */
  graphite: '#55585b',
  /** Vitrocerâmica: vidro quase preto, levemente reflexivo. */
  ceran: '#131517',
  /** Serigrafia dos elementos radiantes sobre o vidro. */
  ceranPrint: '#7c7f82',
  /** Esmalte escuro da cavidade do forno. */
  enamel: '#3c3f42',
  /** Arame cromado das grades do forno. */
  wire: '#c6c9cc',
} as const

const NO_PLANES: THREE.Plane[] = []

export interface ShellMaterialProps {
  color?: string
  roughness?: number
  metalness?: number
  /** `false` para peças que não devem ser fatiadas no modo Corte. */
  clip?: boolean
  /** `false` para materiais que já são translúcidos por natureza (vidro). */
  xray?: boolean
  opacity?: number
  emissive?: string
  emissiveIntensity?: number
  side?: THREE.Side
}

/**
 * Material da carcaça: opaco em Sólido, fatiado pelo plano em Corte e a ~15%
 * de opacidade em Raio-X (com `depthWrite = false`, para não esconder o que
 * está dentro).
 */
export function ShellMaterial({
  color = C.bodyLight,
  roughness = 0.6,
  metalness = 0.1,
  clip = true,
  xray = true,
  opacity = 1,
  emissive,
  emissiveIntensity = 0,
  side = THREE.DoubleSide,
}: ShellMaterialProps) {
  const { view, clipPlanes } = useStove()
  const ref = useRef<THREE.MeshStandardMaterial>(null)
  const isXray = xray && view === 'xray'
  const planes = clip && view === 'cutaway' ? clipPlanes : NO_PLANES
  const finalOpacity = isXray ? 0.15 : opacity
  const isTransparent = finalOpacity < 1

  useEffect(() => {
    const mat = ref.current
    if (!mat) return
    mat.clippingPlanes = planes
    mat.transparent = isTransparent
    mat.opacity = finalOpacity
    mat.depthWrite = !isXray
    mat.needsUpdate = true
  }, [planes, isTransparent, finalOpacity, isXray])

  return (
    <meshStandardMaterial
      ref={ref}
      color={color}
      roughness={roughness}
      metalness={metalness}
      side={side}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissiveIntensity}
    />
  )
}
