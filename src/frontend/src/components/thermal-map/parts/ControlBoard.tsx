import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { pcbTexture } from '../detailTextures'
import { C } from '../materials'
import { damp, useStove } from '../StoveContext'
import { HOUSING } from '../zoneGeometry'
import { PartGroup } from './PartGroup'

const BASE_X = HOUSING.x - 1.6
const BOARD_Y = HOUSING.y - 1.2

const BOARD = { w: 4.4, t: 0.22, d: 2.6 }
/** Y do topo da placa, onde os componentes assentam (coordenada local). */
const TOP = BOARD.t / 2

type V3 = [number, number, number]

/** Componente sobre a placa: caixa em cima do plano da placa (`at` = x, z da base). */
function Part({
  size,
  at,
  color,
  roughness = 0.7,
  metalness = 0.1,
}: {
  size: V3
  at: [number, number]
  color: string
  roughness?: number
  metalness?: number
}) {
  return (
    <mesh position={[at[0], TOP + size[1] / 2, at[1]]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

const BODY_BLACK = '#26282b'
const WHITE_PLASTIC = '#dcdad4'
const ALU = C.metal

/** Dissipador de alumínio extrudado: base + aletas, no canto traseiro-esquerdo. */
function Heatsink() {
  const fins = [-3, -2, -1, 0, 1, 2, 3]
  return (
    <group position={[-1.35, TOP, -0.6]}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.55, 0.1, 1.1]} />
        <meshStandardMaterial color={ALU} roughness={0.35} metalness={0.8} />
      </mesh>
      {fins.map((i) => (
        <mesh key={i} position={[i * 0.23, 0.38, 0]}>
          <boxGeometry args={[0.07, 0.56, 1.0]} />
          <meshStandardMaterial color={ALU} roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/** Capacitor eletrolítico: lata cinza-escura, topo de alumínio e faixa de polaridade. */
function Capacitor({ at }: { at: [number, number] }) {
  return (
    <group position={[at[0], TOP, at[1]]}>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.64, 16]} />
        <meshStandardMaterial color="#303338" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.03, 16]} />
        <meshStandardMaterial color="#b9bcbf" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0.272, 0.32, 0]}>
        <boxGeometry args={[0.012, 0.56, 0.14]} />
        <meshStandardMaterial color="#d3d5d7" roughness={0.6} metalness={0} />
      </mesh>
    </group>
  )
}

/** Conector de fios: corpo de plástico claro com a janela escura dos terminais. */
function Header({ at, n = 4 }: { at: [number, number]; n?: number }) {
  const w = 0.22 * n
  return (
    <group position={[at[0], TOP, at[1]]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[w, 0.32, 0.24]} />
        <meshStandardMaterial color={WHITE_PLASTIC} roughness={0.75} metalness={0} />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(i - (n - 1) / 2) * 0.22, 0.33, 0]}>
          <boxGeometry args={[0.1, 0.04, 0.16]} />
          <meshStandardMaterial color="#2b2d30" roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Placa eletrônica (PCB) dentro da carcaça: desliza entre `Center` e `Right`.
 * Detalhada do módulo de controle do manual: trilhas e ilhas de solda na face,
 * dissipador, capacitores, relés, transformador, conectores e CIs.
 */
export function ControlBoard() {
  const { parts, reducedMotion } = useStove()
  const group = useRef<THREE.Group>(null!)
  const target = BASE_X + parts.board.offsetX
  const pcb = useMemo(() => pcbTexture(), [])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.position.x = damp(group.current.position.x, target, reducedMotion ? 1 : delta, 8)
  })

  return (
    <PartGroup partId="control-board" tooltipAt={[HOUSING.x, BOARD_Y - 1.6, HOUSING.z]}>
      <group ref={group} position={[BASE_X, BOARD_Y, HOUSING.z]}>
        <mesh>
          <boxGeometry args={[BOARD.w, BOARD.t, BOARD.d]} />
          <meshStandardMaterial
            color={pcb ? '#ffffff' : C.pcb}
            map={pcb}
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>

        <Heatsink />
        {/* capacitores de barramento, em fila */}
        <Capacitor at={[0.2, -0.85]} />
        <Capacitor at={[0.8, -0.85]} />
        <Capacitor at={[1.4, -0.85]} />
        {/* relés de potência */}
        <Part size={[0.8, 0.52, 0.46]} at={[0.35, 0.3]} color={WHITE_PLASTIC} roughness={0.6} />
        <Part size={[0.8, 0.52, 0.46]} at={[1.4, 0.3]} color={WHITE_PLASTIC} roughness={0.6} />
        {/* transformador (carretel + núcleo) */}
        <Part size={[0.85, 0.5, 0.7]} at={[-1.5, 0.55]} color="#3b3e42" metalness={0.3} />
        <Part size={[0.87, 0.07, 0.72]} at={[-1.5, 0.55]} color={ALU} metalness={0.7} roughness={0.4} />
        {/* conectores de fios, na borda frontal */}
        <Header at={[-0.5, 1.12]} n={4} />
        <Header at={[0.75, 1.12]} n={3} />
        <Header at={[1.85, 1.12]} n={2} />
        {/* CIs */}
        <Part size={[0.4, 0.07, 0.4]} at={[2.0, -0.2]} color={BODY_BLACK} roughness={0.5} />
        <Part size={[0.3, 0.06, 0.3]} at={[2.0, 0.6]} color={BODY_BLACK} roughness={0.5} />

        {/* espaçadores de fixação, sob os quatro cantos */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 1.95, -0.26, sz * 1.0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
              <meshStandardMaterial color={C.wire} roughness={0.35} metalness={0.8} />
            </mesh>
          )),
        )}
      </group>
    </PartGroup>
  )
}
