/**
 * Aberturas semânticas do fogão (Fase 1d, etapa A).
 *
 * Em vez de um slider abstrato de corte, o controle principal passa a ser
 * "Abrir console / Abrir traseira / Abrir forno". Cada `<Openable>` envolve as
 * peças que se afastam e interpola entre fechado e aberto com o mesmo
 * amortecimento das demais peças (`damp`), respeitando `prefers-reduced-motion`.
 *
 * Tudo que precisa acompanhar uma abertura — inclusive as zonas coloridas da
 * fachada do console e seus rótulos — é filho do mesmo `<Openable>`, de modo
 * que geometria, raycast e `<Html>` nunca saem de sincronia.
 */

import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'

import { damp, useStove, type OpeningState } from './StoveContext'
import { BODY, BODY_FRONT } from './zoneGeometry'

/** Aberturas físicas (com transformação); `explode` é da `<ExplodeLayer>`, não daqui. */
export type OpeningKind = Exclude<keyof OpeningState, 'explode'>

/** Quanto a tampa do console sobe quando aberta, em unidades de cena. */
export const CONSOLE_LIFT = 6
/** Quanto o painel traseiro recua quando aberto. */
export const REAR_SLIDE = 9
/** Ângulo da porta do forno aberta (~80°). */
export const OVEN_DOOR_ANGLE = (80 * Math.PI) / 180
/** Y da dobradiça inferior da porta do forno. */
export const DOOR_HINGE_Y = -BODY.h / 2 + 4.6   // era + 1.3

interface OpeningTransform {
  /** Ponto em torno do qual a peça gira (e origem do deslocamento). */
  pivot: [number, number, number]
  /** Deslocamento quando totalmente aberta. */
  offset: [number, number, number]
  /** Rotação (rad) quando totalmente aberta. */
  rotation: [number, number, number]
}

export const OPENING_TRANSFORMS: Record<OpeningKind, OpeningTransform> = {
  console: { pivot: [0, 0, 0], offset: [0, CONSOLE_LIFT, 0], rotation: [0, 0, 0] },
  rear: { pivot: [0, 0, 0], offset: [0, 0, -REAR_SLIDE], rotation: [0, 0, 0] },
  oven: {
    pivot: [0, DOOR_HINGE_Y, BODY_FRONT + 0.4],
    offset: [0, 0, 0],
    rotation: [OVEN_DOOR_ANGLE, 0, 0],
  },
}

export function Openable({ kind, children }: { kind: OpeningKind; children: ReactNode }) {
  const { openings, reducedMotion } = useStove()
  const t = OPENING_TRANSFORMS[kind]
  const group = useRef<THREE.Group>(null!)
  const k = useRef(openings[kind] ? 1 : 0)

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    k.current = damp(k.current, openings[kind] ? 1 : 0, reducedMotion ? 1 : delta, 7)
    const f = k.current
    g.position.set(
      t.pivot[0] + t.offset[0] * f,
      t.pivot[1] + t.offset[1] * f,
      t.pivot[2] + t.offset[2] * f,
    )
    g.rotation.set(t.rotation[0] * f, t.rotation[1] * f, t.rotation[2] * f)
  })

  const initial = openings[kind] ? 1 : 0
  return (
    <group
      ref={group}
      position={[
        t.pivot[0] + t.offset[0] * initial,
        t.pivot[1] + t.offset[1] * initial,
        t.pivot[2] + t.offset[2] * initial,
      ]}
      rotation={[t.rotation[0] * initial, t.rotation[1] * initial, t.rotation[2] * initial]}
    >
      {/* devolve as coordenadas de mundo aos filhos: eles são escritos na
          posição fechada e o pivô some do cálculo */}
      <group position={[-t.pivot[0], -t.pivot[1], -t.pivot[2]]}>{children}</group>
    </group>
  )
}
