import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { damp, useStove } from '../StoveContext'
import { HOUSING } from '../zoneGeometry'
import { PartGroup } from './PartGroup'

const BASE_X = HOUSING.x - 1.6
const BOARD_Y = HOUSING.y - 1.2

/** Placa eletrônica (PCB) dentro da carcaça: desliza entre `Center` e `Right`. */
export function ControlBoard() {
  const { parts, reducedMotion } = useStove()
  const group = useRef<THREE.Group>(null!)
  const target = BASE_X + parts.board.offsetX

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.position.x = damp(group.current.position.x, target, reducedMotion ? 1 : delta, 8)
  })

  return (
    <PartGroup partId="control-board" tooltipAt={[HOUSING.x, BOARD_Y - 1.6, HOUSING.z]}>
      <group ref={group} position={[BASE_X, BOARD_Y, HOUSING.z]}>
        <mesh>
          <boxGeometry args={[4.4, 0.22, 2.6]} />
          <meshStandardMaterial color={C.pcb} roughness={0.8} metalness={0.05} />
        </mesh>
        {[-1.3, 0, 1.2].map((x, i) => (
          <mesh key={x} position={[x, 0.32, i === 1 ? 0.5 : -0.4]}>
            <boxGeometry args={[0.9, 0.4, 0.7]} />
            <meshStandardMaterial color={C.dark} roughness={0.7} metalness={0.1} />
          </mesh>
        ))}
      </group>
    </PartGroup>
  )
}
