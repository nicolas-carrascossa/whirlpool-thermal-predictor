import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { damp, useStove } from '../StoveContext'
import { COIL } from '../zoneGeometry'
import { PartGroup } from './PartGroup'
import type { CoilSupportPreset } from './index'

const RING_R = COIL.radius + 0.8

/**
 * Os três presets se distinguem pelo **acabamento**, não pelo matiz (etapa B):
 * metálico brilhante, disco metálico fosco e escuro fosco — todos neutros.
 */
const PRESETS: Record<CoilSupportPreset, { color: string; metalness: number; roughness: number }> = {
  aluminium: { color: '#c9ccd0', metalness: 0.95, roughness: 0.18 },
  'aluminium-plate': { color: '#9fa0a1', metalness: 0.7, roughness: 0.55 },
  plastic: { color: '#484949', metalness: 0, roughness: 0.95 },
}

/** Um dos três desenhos do suporte; some por escala quando não é o selecionado. */
function Variant({
  active,
  preset,
  children,
}: {
  active: boolean
  preset: CoilSupportPreset
  children: (mat: React.ReactNode) => React.ReactNode
}) {
  const { reducedMotion } = useStove()
  const group = useRef<THREE.Group>(null!)
  const p = PRESETS[preset]

  useFrame((_, delta) => {
    if (!group.current) return
    const s = damp(group.current.scale.x, active ? 1 : 0.001, reducedMotion ? 1 : delta, 9)
    group.current.scale.setScalar(s)
    group.current.visible = s > 0.03
  })

  return (
    <group ref={group} scale={active ? 1 : 0.001}>
      {children(<meshStandardMaterial color={p.color} metalness={p.metalness} roughness={p.roughness} />)}
    </group>
  )
}

/**
 * Suporte da resistência (`material_coil_support`):
 * alumínio (anel metálico claro), chapa de alumínio (disco sob a resistência)
 * ou plástico (anel escuro fosco).
 */
export function CoilSupport() {
  const { parts } = useStove()
  const preset = parts.coilSupport.preset

  return (
    <PartGroup partId="coil-support" tooltipAt={[0, COIL.y - 2.4, COIL.z]}>
      <group position={[0, COIL.y, COIL.z]}>
        <Variant active={preset === 'aluminium'} preset="aluminium">
          {(mat) => (
            <>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[RING_R, 0.22, 8, 36]} />
                {mat}
              </mesh>
              {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => (
                <mesh
                  key={a}
                  position={[Math.cos(a) * (RING_R - 0.5), -0.3, Math.sin(a) * (RING_R - 0.5)]}
                  rotation={[0, -a, 0]}
                >
                  <boxGeometry args={[1.4, 0.5, 0.5]} />
                  {mat}
                </mesh>
              ))}
            </>
          )}
        </Variant>

        <Variant active={preset === 'aluminium-plate'} preset="aluminium-plate">
          {(mat) => (
            <mesh position={[0, -1.1, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[RING_R + 0.6, RING_R + 0.6, 0.3, 40]} />
              {mat}
            </mesh>
          )}
        </Variant>

        <Variant active={preset === 'plastic'} preset="plastic">
          {(mat) => (
            <>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[RING_R, 0.34, 8, 30]} />
                {mat}
              </mesh>
              {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a) => (
                <mesh
                  key={a}
                  position={[Math.cos(a) * (RING_R - 0.5), -0.3, Math.sin(a) * (RING_R - 0.5)]}
                  rotation={[0, -a, 0]}
                >
                  <boxGeometry args={[1.5, 0.6, 0.7]} />
                  {mat}
                </mesh>
              ))}
            </>
          )}
        </Variant>
      </group>
    </PartGroup>
  )
}
