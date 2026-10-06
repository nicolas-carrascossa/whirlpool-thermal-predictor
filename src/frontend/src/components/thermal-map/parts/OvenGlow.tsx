import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { ovenBadgeText } from '../ovenBadge'
import { damp, useStove } from '../StoveContext'
import { BODY_FRONT, CAVITY } from '../zoneGeometry'
import { PartGroup } from './PartGroup'

const BACK_Z = CAVITY.zCenter - CAVITY.d / 2

/**
 * Brilho da cavidade do forno: parede do fundo emissiva + luz pontual interna,
 * com intensidade proporcional ao setpoint do `run_case`
 * (Pyro 400 °C forte, Broil 280 °C médio).
 */
export function OvenGlow({ showBadge = true }: { showBadge?: boolean }) {
  const { parts, reducedMotion, config } = useStove()
  const mat = useRef<THREE.MeshStandardMaterial>(null!)
  const light = useRef<THREE.PointLight>(null!)

  // Etapa B: o brilho deixa de ser protagonista — no máximo 0,25 de emissivo
  // num tom quente acinzentado. Quem informa o estado do forno é o selo.
  const k = parts.ovenGlow.intensity
  const targetEmissive = 0.08 + k * k * k * 0.17
  const targetLight = 0.15 + k * k * k * 0.5

  useFrame((_, delta) => {
    const d = reducedMotion ? 1 : delta
    if (mat.current) mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, targetEmissive, d, 5)
    if (light.current) light.current.intensity = damp(light.current.intensity, targetLight, d, 5)
  })

  return (
    <PartGroup partId="oven-glow" tooltipAt={[0, CAVITY.yCenter + 5, BACK_Z + 2]}>
      <mesh position={[0, CAVITY.yCenter, BACK_Z]}>
        <boxGeometry args={[CAVITY.w, CAVITY.h, 0.5]} />
        <meshStandardMaterial
          ref={mat}
          color="#3c3a38"
          emissive={C.ovenTint}
          emissiveIntensity={0.12}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0, CAVITY.yCenter, CAVITY.zCenter]}
        color={C.ovenTint}
        intensity={0.3}
        distance={30}
        decay={1.6}
      />

      {/* selo do forno junto à porta, sob a tela: a informação que o brilho antes tentava dar */}
      {showBadge && (
        <Html
          position={[0, 6.95, BODY_FRONT + 1.6]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            data-testid="oven-badge"
            className="tabular whitespace-nowrap rounded-full border border-wp-gray12 bg-white/95 px-2.5 py-1 font-body text-[11px] font-semibold text-wp-gray85 shadow-sm"
          >
            {ovenBadgeText(config)}
          </div>
        </Html>
      )}
    </PartGroup>
  )
}
