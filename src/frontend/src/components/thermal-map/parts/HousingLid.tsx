import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { damp, useStove } from '../StoveContext'
import { HOUSING } from '../zoneGeometry'
import { PartGroup } from './PartGroup'

const SLOT_X = [-2.4, -1.44, -0.48, 0.48, 1.44, 2.4]

/**
 * Tampa da carcaça da eletrônica (`housing`).
 * - `Closed`: tampa assentada sobre a caixa do IPC.
 * - `Open`: tampa levantada e girada na dobradiça traseira.
 * - `Open - Updated`: idem, mais uma fileira de rasgos de ventilação na caixa.
 */
export function HousingLid() {
  const { parts, reducedMotion } = useStove()
  const hinge = useRef<THREE.Group>(null!)
  const slots = useRef<THREE.Group>(null!)

  const targetAngle = parts.lid.open ? -1.15 : 0
  const targetLift = parts.lid.open ? 1.5 : 0
  const targetSlot = parts.lid.vented ? 1 : 0.001

  useFrame((_, delta) => {
    const d = reducedMotion ? 1 : delta
    if (hinge.current) {
      hinge.current.rotation.x = damp(hinge.current.rotation.x, targetAngle, d, 8)
      hinge.current.position.y = damp(hinge.current.position.y, HOUSING.y + HOUSING.h / 2 + targetLift, d, 8)
    }
    if (slots.current) {
      const s = damp(slots.current.scale.y, targetSlot, d, 10)
      slots.current.scale.set(1, s, 1)
      slots.current.visible = s > 0.02
    }
  })

  return (
    <PartGroup partId="housing-lid" tooltipAt={[HOUSING.x, HOUSING.y + 3.4, HOUSING.z]}>
      <group ref={hinge} position={[HOUSING.x, HOUSING.y + HOUSING.h / 2, HOUSING.z - HOUSING.d / 2]}>
        <mesh position={[0, 0.2, HOUSING.d / 2]}>
          <boxGeometry args={[HOUSING.w + 0.3, 0.4, HOUSING.d + 0.3]} />
          <meshStandardMaterial color={C.bodyMid} roughness={0.55} metalness={0.25} />
        </mesh>
        {/* nervuras de reforço estampadas na tampa */}
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 0.44, HOUSING.d / 2]}>
            <boxGeometry args={[0.2, 0.08, HOUSING.d - 0.7]} />
            <meshStandardMaterial color={C.bodyMid} roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
        {/* parafusos de fixação da tampa, nos quatro cantos */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * (HOUSING.w / 2 - 0.25), 0.44, HOUSING.d / 2 + sz * (HOUSING.d / 2 - 0.25)]}>
              <cylinderGeometry args={[0.14, 0.14, 0.08, 10]} />
              <meshStandardMaterial color={C.wire} roughness={0.35} metalness={0.8} />
            </mesh>
          )),
        )}
      </group>

      {/* paredes da carcaça (fundo = zona IPC Comp, frente aberta) */}
      <mesh position={[HOUSING.x, HOUSING.y - HOUSING.h / 2, HOUSING.z]}>
        <boxGeometry args={[HOUSING.w, 0.3, HOUSING.d]} />
        <meshStandardMaterial color={C.bodyMid} roughness={0.6} metalness={0.2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[HOUSING.x + s * (HOUSING.w / 2), HOUSING.y, HOUSING.z]}>
          <boxGeometry args={[0.3, HOUSING.h, HOUSING.d]} />
          <meshStandardMaterial color={C.bodyMid} roughness={0.6} metalness={0.2} />
        </mesh>
      ))}

      {/* orelhas de fixação da carcaça ao fundo da baía, com parafuso */}
      {[-1, 1].map((s) => (
        <group key={s} position={[HOUSING.x + s * (HOUSING.w / 2 + 0.38), HOUSING.y - HOUSING.h / 2 + 0.06, HOUSING.z]}>
          <mesh>
            <boxGeometry args={[0.78, 0.12, 1.0]} />
            <meshStandardMaterial color={C.bodyMid} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.1, 10]} />
            <meshStandardMaterial color={C.wire} roughness={0.35} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* rasgos de ventilação na boca da carcaça (só em "Open - Updated") */}
      <group ref={slots} position={[HOUSING.x, HOUSING.y, HOUSING.z + HOUSING.d / 2 + 0.06]}>
        {SLOT_X.map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <boxGeometry args={[0.42, 2.6, 0.12]} />
            <meshStandardMaterial color={C.dark} roughness={0.9} metalness={0} />
          </mesh>
        ))}
      </group>
    </PartGroup>
  )
}
