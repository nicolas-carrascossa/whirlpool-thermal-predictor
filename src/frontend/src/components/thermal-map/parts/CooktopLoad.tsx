import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { damp, useStove } from '../StoveContext'
import { BODY, BURNER_SLOTS } from '../zoneGeometry'
import { PartGroup } from './PartGroup'
import type { CooktopLoadItem } from './index'

const TOP_Y = BODY.h / 2 // 12
const GRATE_Y = TOP_Y + 0.6
const SLOT_HALF = 3.25

/** Caixa envolvente (centro e tamanho em X/Z) dos queimadores cobertos. */
function slotBounds(slots: number[]) {
  const xs = slots.map((s) => BURNER_SLOTS[s][0])
  const zs = slots.map((s) => BURNER_SLOTS[s][1])
  const minX = Math.min(...xs) - SLOT_HALF
  const maxX = Math.max(...xs) + SLOT_HALF
  const minZ = Math.min(...zs) - SLOT_HALF
  const maxZ = Math.max(...zs) + SLOT_HALF
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    w: maxX - minX,
    d: maxZ - minZ,
  }
}

/** Cresce/encolhe a carga quando o modo de operação muda. */
function Grow({ children }: { children: React.ReactNode }) {
  const { reducedMotion } = useStove()
  const group = useRef<THREE.Group>(null!)
  useFrame((_, delta) => {
    if (!group.current) return
    group.current.scale.setScalar(damp(group.current.scale.x, 1, reducedMotion ? 1 : delta, 9))
  })
  return (
    <group ref={group} scale={0.001}>
      {children}
    </group>
  )
}

function Pan({ item }: { item: CooktopLoadItem }) {
  const b = slotBounds(item.slots)
  return (
    <Grow>
      <group position={[b.x, GRATE_Y + 0.75, b.z]}>
        <mesh>
          <cylinderGeometry args={[2.2, 1.9, 1.5, 28]} />
          <meshStandardMaterial color={C.gray45} roughness={0.35} metalness={0.7} />
        </mesh>
        <mesh position={[3.4, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 2.6, 10]} />
          <meshStandardMaterial color={C.dark} roughness={0.85} metalness={0} />
        </mesh>
      </group>
    </Grow>
  )
}

function Griddle({ item }: { item: CooktopLoadItem }) {
  const b = slotBounds(item.slots)
  return (
    <Grow>
      <mesh position={[b.x, GRATE_Y + 0.3, b.z]}>
        <boxGeometry args={[b.w - 0.8, 0.55, b.d - 0.8]} />
        <meshStandardMaterial color={C.dark} roughness={0.7} metalness={0.25} />
      </mesh>
    </Grow>
  )
}

/** Emissivo do anel aceso: pequeno e discreto (etapa B). */
const LIT_EMISSIVE = 0.45

/** Queimador aceso: anel emissivo pequeno, rente à mesa. */
function LitBurner({ slot, on }: { slot: number; on: boolean }) {
  const { reducedMotion } = useStove()
  const mat = useRef<THREE.MeshStandardMaterial>(null!)
  const [x, z] = BURNER_SLOTS[slot]
  useFrame((_, delta) => {
    if (!mat.current) return
    mat.current.emissiveIntensity = damp(
      mat.current.emissiveIntensity,
      on ? LIT_EMISSIVE : 0,
      reducedMotion ? 1 : delta,
      6,
    )
    mat.current.opacity = Math.min(1, mat.current.emissiveIntensity / LIT_EMISSIVE)
  })
  return (
    <mesh position={[x, TOP_Y + 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.5, 0.13, 8, 26]} />
      <meshStandardMaterial
        ref={mat}
        color={C.ember}
        emissive={C.ember}
        emissiveIntensity={0}
        transparent
        opacity={0}
        roughness={0.5}
      />
    </mesh>
  )
}

/** Panelas, chapa e queimadores acesos conforme o `run_case`. */
export function CooktopLoad() {
  const { parts } = useStove()
  const { loads, litSlots } = parts.cooktop

  return (
    <PartGroup partId="cooktop-load" tooltipAt={[0, TOP_Y + 4.5, 0]}>
      {loads.map((item, i) =>
        item.kind === 'pan' ? (
          <Pan key={`${item.kind}-${item.slots.join('-')}-${i}`} item={item} />
        ) : (
          <Griddle key={`${item.kind}-${item.slots.join('-')}-${i}`} item={item} />
        ),
      )}
      {BURNER_SLOTS.map((_, slot) => (
        <LitBurner key={slot} slot={slot} on={litSlots.includes(slot)} />
      ))}
    </PartGroup>
  )
}
