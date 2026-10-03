import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { useStove } from '../StoveContext'
import { BLOWER } from '../zoneGeometry'
import { BlowerBody } from './BlowerBody'
import { PartGroup } from './PartGroup'

/** Trajetos retos percorridos pelas setas de ar. */
// Na baía sob o cooktop: "frente" sopra para +Z (frente do fogão), "traseira"
// atravessa o painel Mainback em -Z.
const PATH_FRONT: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(BLOWER.x, BLOWER.y, BLOWER.z - 1.2),
  new THREE.Vector3(BLOWER.x, BLOWER.y + 0.3, BLOWER.z + 7.0),
]
const PATH_BACK: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(BLOWER.x, BLOWER.y, BLOWER.z + 1.2),
  new THREE.Vector3(BLOWER.x, BLOWER.y, -10.6),
]
/** Ramificação para a carcaça do IPC, atravessando o furo do defletor (H1). */
const PATH_BRANCH: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(BLOWER.x + 2.3, BLOWER.y - 0.1, BLOWER.z),
  new THREE.Vector3(7.6, BLOWER.y - 0.3, BLOWER.z),
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
      {/* voluta, rotor, motor e pés */}
      <BlowerBody fan={fan} />
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
