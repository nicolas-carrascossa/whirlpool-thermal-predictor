import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { useStove } from '../StoveContext'
import { BLOWER } from '../zoneGeometry'
import { PartGroup } from './PartGroup'

/** Trajetos retos percorridos pelas setas de ar. */
const PATH_FRONT: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(BLOWER.x, BLOWER.y, -8.4),
  new THREE.Vector3(BLOWER.x, 15.6, -2.2),
]
const PATH_BACK: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(BLOWER.x, BLOWER.y, -4.2),
  new THREE.Vector3(BLOWER.x, BLOWER.y, -10.6),
]
/** Ramificação para a carcaça do IPC, atravessando o furo do defletor (H1). */
const PATH_BRANCH: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(BLOWER.x + 2.3, BLOWER.y - 0.1, -6.25),
  new THREE.Vector3(7.6, BLOWER.y - 0.3, -6.25),
]

const ARROW_COUNT = 30
const UP = new THREE.Vector3(0, 1, 0)

function quatFor(path: [THREE.Vector3, THREE.Vector3]): THREE.Quaternion {
  const dir = path[1].clone().sub(path[0]).normalize()
  return new THREE.Quaternion().setFromUnitVectors(UP, dir)
}

/**
 * Blower de resfriamento e as setas de fluxo de ar.
 * `blower_direction` define o trajeto principal (frente do console × painel
 * traseiro); com `deflector_hole = Open`, 40% das setas se desviam para a
 * carcaça do IPC.
 */
export function Blower() {
  const { parts, reducedMotion, highlightPart, hoveredPart } = useStove()
  const fan = useRef<THREE.Group>(null!)
  const arrows = useRef<THREE.InstancedMesh>(null!)
  // etapa B: as setas são cinza por padrão e só ganham `--wp-accent` enquanto
  // o blower ou o defletor estão em foco (hover ou pulso de alteração).
  const airFocused =
    highlightPart === 'blower' ||
    highlightPart === 'deflector' ||
    hoveredPart === 'blower' ||
    hoveredPart === 'deflector'

  const offsets = useMemo(() => Array.from({ length: ARROW_COUNT }, (_, i) => i / ARROW_COUNT), [])
  const progress = useRef<number[]>(offsets.slice())
  const scratch = useMemo(
    () => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3() }),
    [],
  )
  const quats = useMemo(
    () => ({ front: quatFor(PATH_FRONT), back: quatFor(PATH_BACK), branch: quatFor(PATH_BRANCH) }),
    [],
  )

  const branchCount = Math.round(ARROW_COUNT * parts.deflector.branchFraction)
  const mainPath = parts.blower.direction === 'front' ? PATH_FRONT : PATH_BACK
  const mainQuat = parts.blower.direction === 'front' ? quats.front : quats.back

  useFrame((_, delta) => {
    if (fan.current && !reducedMotion) fan.current.rotation.z += delta * 6
    const inst = arrows.current
    if (!inst) return
    const step = reducedMotion ? 0 : delta * 0.45
    for (let i = 0; i < ARROW_COUNT; i += 1) {
      let t = progress.current[i] + step
      if (t > 1) t -= 1
      progress.current[i] = t
      const isBranch = i < branchCount
      const path = isBranch ? PATH_BRANCH : mainPath
      const quat = isBranch ? quats.branch : mainQuat
      scratch.p.lerpVectors(path[0], path[1], t)
      // some nas pontas do trajeto, para o ciclo não "pular"
      const fade = Math.min(1, Math.sin(Math.PI * t) * 2.2)
      scratch.s.setScalar(Math.max(0.001, fade))
      scratch.m.compose(scratch.p, quat, scratch.s)
      inst.setMatrixAt(i, scratch.m)
    }
    inst.instanceMatrix.needsUpdate = true
  })

  return (
    <PartGroup partId="blower" tooltipAt={[BLOWER.x, BLOWER.y + 2.8, BLOWER.z]}>
      {/* carcaça do ventilador */}
      <mesh position={[BLOWER.x, BLOWER.y, BLOWER.z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[BLOWER.radius, BLOWER.radius, 1.5, 22, 1, true]} />
        <meshStandardMaterial color={C.metalDark} roughness={0.5} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* rotor */}
      <group ref={fan} position={[BLOWER.x, BLOWER.y, BLOWER.z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 1.3, 12]} />
          <meshStandardMaterial color={C.dark} roughness={0.6} metalness={0.3} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <boxGeometry args={[BLOWER.radius * 1.5, 0.28, 0.9]} />
            <meshStandardMaterial color={C.metal} roughness={0.35} metalness={0.7} />
          </mesh>
        ))}
      </group>
      {/* setas de fluxo */}
      <instancedMesh ref={arrows} args={[undefined, undefined, ARROW_COUNT]} frustumCulled={false}>
        <coneGeometry args={[0.3, 0.85, 8]} />
        <meshStandardMaterial
          color={airFocused ? C.accent : C.gray45}
          emissive={airFocused ? C.accent : '#000000'}
          emissiveIntensity={airFocused ? 0.45 : 0}
          roughness={0.6}
          metalness={0}
        />
      </instancedMesh>
    </PartGroup>
  )
}
