import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { damp, useStove } from '../StoveContext'
import { DEFLECTOR } from '../zoneGeometry'
import { PartGroup } from './PartGroup'

/**
 * Defletor de ar: placa vertical entre o blower e a carcaça do IPC. A placa é
 * sempre extrudada com um furo (`Shape` + `Path`); o estado `Closed` é o
 * tampão que fecha esse furo — assim a transição pode ser animada.
 */
export function DeflectorPlate() {
  const { parts, reducedMotion } = useStove()
  const plug = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(() => {
    const { h, d, t, holeR } = DEFLECTOR
    const shape = new THREE.Shape()
    shape.moveTo(-d / 2, -h / 2)
    shape.lineTo(d / 2, -h / 2)
    shape.lineTo(d / 2, h / 2)
    shape.lineTo(-d / 2, h / 2)
    shape.closePath()
    const hole = new THREE.Path()
    hole.absarc(0, 0, holeR, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 24 })
    geo.translate(0, 0, -t / 2)
    return geo
  }, [])

  const target = parts.deflector.hole ? 0.001 : 1

  useFrame((_, delta) => {
    if (!plug.current) return
    const s = damp(plug.current.scale.x, target, reducedMotion ? 1 : delta, 9)
    plug.current.scale.set(s, 1, s)
    plug.current.visible = s > 0.03
  })

  return (
    <PartGroup partId="deflector" tooltipAt={[DEFLECTOR.x, DEFLECTOR.y + 3.6, DEFLECTOR.z]}>
      <group position={[DEFLECTOR.x, DEFLECTOR.y, DEFLECTOR.z]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={C.metalDark} roughness={0.45} metalness={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={plug} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[DEFLECTOR.holeR, DEFLECTOR.holeR, DEFLECTOR.t, 24]} />
          <meshStandardMaterial color={C.metalDark} roughness={0.45} metalness={0.65} />
        </mesh>
      </group>
    </PartGroup>
  )
}
