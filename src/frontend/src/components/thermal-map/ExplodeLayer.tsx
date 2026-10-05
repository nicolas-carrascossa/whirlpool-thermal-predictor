/**
 * Vista explodida: cada camada do fogão translada em +Y proporcionalmente a
 * `explodeAmount` (0–100 %), com deslocamentos crescentes de baixo para cima
 * (`EXPLODE_LIFT` em `explode.ts`). Segue o padrão do `<Openable>`: um grupo
 * animado com `damp()` em `useFrame`, respeitando `prefers-reduced-motion`, e
 * as zonas, pinos e rótulos da camada são filhos do mesmo grupo para nunca
 * descolarem da peça.
 *
 * É ortogonal às aberturas e aos modos Sólido/Corte/Raio-X: só transformação.
 */

import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'

import { layerLiftFor, rearPushFor, type ExplodeLayerId } from './explode'
import { damp, useStove } from './StoveContext'

export function ExplodeLayer({ layer, children }: { layer: ExplodeLayerId; children: ReactNode }) {
  const { openings, explodeAmount, reducedMotion } = useStove()
  const group = useRef<THREE.Group>(null!)
  const target = openings.explode ? layerLiftFor(layer, explodeAmount) : 0

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    g.position.y = damp(g.position.y, target, reducedMotion ? 1 : delta, 7)
  })

  // A posição não é passada como prop: o slider muda `target` a cada tick e o
  // prop faria o grupo saltar antes de o amortecimento agir.
  return <group ref={group}>{children}</group>
}

/**
 * Camada do painel traseiro: em vez de subir, recua em -Z. Leva junto a zona
 * `Mainback` e as ferragens — a zona é a face externa do painel, então os dois
 * têm de andar no mesmo grupo (`<Openable kind="rear">` por fora).
 */
export function ExplodeRear({ children }: { children: ReactNode }) {
  const { openings, explodeAmount, reducedMotion } = useStove()
  const group = useRef<THREE.Group>(null!)
  const target = openings.explode ? rearPushFor(explodeAmount) : 0

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    g.position.z = damp(g.position.z, -target, reducedMotion ? 1 : delta, 7)
  })

  return <group ref={group}>{children}</group>
}
