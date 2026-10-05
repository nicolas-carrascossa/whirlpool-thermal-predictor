/**
 * Corpo do blower AC (`Main Vent Sys`): a voluta (carcaça em caracol com saída
 * tangencial), o rotor de gaiola de esquilo, o motor de indução por trás
 * (pacote de lâminas, enrolamentos, capacitor de partida e conector do sensor
 * Hall) e os pés com coxins de borracha. Os sensores desta zona medem a entrada
 * do blower, o conector HES, os enrolamentos, a carcaça e a saída — as peças
 * correspondentes estão aqui e em `MainVentParts`.
 *
 * Eixo em Z, entrada para +Z (frente do fogão). O rotor gira no grupo recebido
 * em `fan`; o resto é estático. Decoração dentro do `PartGroup` do blower: herda
 * o pulso de destaque e o tooltip dele.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'

import { C } from '../materials'
import { BLOWER } from '../zoneGeometry'

/** Voluta: raio inicial (língua), raio final (saída) e topo da saída. */
const R0 = 1.32
const R1 = 1.88
const OUTLET_TOP = 1.95
/** Meia-profundidade da voluta (z) e espessura das chapas laterais. */
const HALF_D = 0.6
const PLATE_T = 0.06
const BLADES = 30
const BLADE_R = 1.1

/** Cobre fosco dos enrolamentos, dessaturado: não compete com o dado. */
const WINDING = '#8f8479'
const RUBBER = '#2b2d2f'
const NYLON = '#dcdad4'

/** Contorno da voluta: desce pela saída, volta pela espiral até a língua e sobe pela parede da saída. */
function scrollOutline(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [new THREE.Vector2(R1, OUTLET_TOP)]
  const steps = 64
  for (let i = 0; i <= steps; i += 1) {
    const t = 1 - i / steps
    const phi = t * Math.PI * 2
    const r = R0 + (R1 - R0) * t
    pts.push(new THREE.Vector2(r * Math.cos(phi), r * Math.sin(phi)))
  }
  pts.push(new THREE.Vector2(R0, OUTLET_TOP))
  return pts
}

function extrude(shape: THREE.Shape, depth: number, z: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 })
  geo.translate(0, 0, z)
  return geo
}

function useScrollGeometries() {
  const geos = useMemo(() => {
    const outline = scrollOutline()
    const cx = 0
    const cy = 0.45
    const inner = outline.map((p) => new THREE.Vector2((p.x - cx) * 0.955 + cx, (p.y - cy) * 0.955 + cy))

    const band = new THREE.Shape(outline)
    band.holes.push(new THREE.Path(inner))

    const front = new THREE.Shape(outline)
    const inlet = new THREE.Path()
    inlet.absarc(0, 0, 1.0, 0, Math.PI * 2, true)
    front.holes.push(inlet)

    return {
      band: extrude(band, HALF_D * 2, -HALF_D),
      front: extrude(front, PLATE_T, HALF_D),
      back: extrude(new THREE.Shape(outline), PLATE_T, -HALF_D - PLATE_T),
    }
  }, [])
  useEffect(
    () => () => {
      geos.band.dispose()
      geos.front.dispose()
      geos.back.dispose()
    },
    [geos],
  )
  return geos
}

function Metal({ color = C.metalDark, roughness = 0.5, metalness = 0.6 }: { color?: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} side={THREE.DoubleSide} />
}

/** Cilindro deitado em Z, de `z0` a `z1` (relativo ao blower). */
function ZCyl({
  x = 0,
  y = 0,
  z0,
  z1,
  r,
  color = C.metalDark,
  segments = 20,
  roughness = 0.5,
  metalness = 0.6,
}: {
  x?: number
  y?: number
  z0: number
  z1: number
  r: number
  color?: string
  segments?: number
  roughness?: number
  metalness?: number
}) {
  return (
    <mesh position={[x, y, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[r, r, Math.abs(z1 - z0), segments]} />
      <Metal color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

/** Rotor de gaiola de esquilo: duas coroas, 30 palhetas inclinadas e o disco do fundo. */
function Impeller({ fan }: { fan: RefObject<THREE.Group> }) {
  const blades = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const one = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < BLADES; i += 1) {
      const a = (i / BLADES) * Math.PI * 2
      p.set(Math.cos(a) * BLADE_R, Math.sin(a) * BLADE_R, 0)
      q.setFromEuler(new THREE.Euler(0, 0, a + 0.5))
      m.compose(p, q, one)
      blades.current.setMatrixAt(i, m)
    }
    blades.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group ref={fan}>
      <instancedMesh ref={blades} args={[undefined, undefined, BLADES]} frustumCulled={false}>
        <boxGeometry args={[0.34, 0.035, 1.02]} />
        <Metal color={C.metal} roughness={0.35} metalness={0.7} />
      </instancedMesh>
      {[-0.51, 0.51].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[BLADE_R, 0.04, 6, 48]} />
          <Metal color={C.metal} roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
      <ZCyl z0={-0.54} z1={-0.5} r={BLADE_R + 0.04} color={C.dark} segments={40} metalness={0.3} />
      <ZCyl z0={-0.5} z1={-0.1} r={0.34} color={C.dark} segments={20} metalness={0.3} />
    </group>
  )
}

/** Motor de indução: pacote de lâminas, enrolamentos nas duas pontas, tampa, capacitor e conector Hall. */
function Motor() {
  const z0 = -HALF_D - PLATE_T
  const stackA = z0 - 0.12
  const stackB = stackA - 0.5
  return (
    <group>
      {/* três espaçadores prendem o motor à chapa de trás da voluta */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2
        return <ZCyl key={i} x={Math.cos(a) * 0.62} y={Math.sin(a) * 0.62} z0={z0} z1={stackA} r={0.06} color={C.wire} segments={8} />
      })}
      <ZCyl z0={stackA} z1={stackB} r={0.78} color={C.gray65} segments={32} roughness={0.55} />
      {/* enrolamentos: um anel em cada ponta do pacote */}
      {[stackA, stackB].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[0.62, 0.17, 8, 32]} />
          <meshStandardMaterial color={WINDING} roughness={0.75} metalness={0.2} />
        </mesh>
      ))}
      {/* tampa traseira com rolamento e furos de ventilação */}
      <ZCyl z0={stackB} z1={stackB - 0.28} r={0.74} color={C.metalDark} segments={32} />
      <ZCyl z0={stackB - 0.28} z1={stackB - 0.46} r={0.26} color={C.wire} segments={16} metalness={0.8} roughness={0.3} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, stackB - 0.285]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.28, 0.08, 0.02]} />
            <meshStandardMaterial color={RUBBER} roughness={0.8} metalness={0} />
          </mesh>
        )
      })}
      {/* capacitor de partida em cima do motor, preso por uma cinta */}
      <mesh position={[0, 0.98, (stackA + stackB) / 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.24, 0.24, 0.95, 16]} />
        <meshStandardMaterial color="#b7babd" roughness={0.4} metalness={0.7} />
      </mesh>
      {[-0.22, 0.22].map((dx) => (
        <mesh key={dx} position={[dx, 0.98, (stackA + stackB) / 2]}>
          <boxGeometry args={[0.07, 0.5, 0.52]} />
          <meshStandardMaterial color={C.dark} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* conector do sensor Hall (HES): corpo de nylon e janela escura */}
      <mesh position={[0.92, 0.28, stackB - 0.1]}>
        <boxGeometry args={[0.5, 0.34, 0.28]} />
        <meshStandardMaterial color={NYLON} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0.92, 0.28, stackB - 0.25]}>
        <boxGeometry args={[0.36, 0.16, 0.02]} />
        <meshStandardMaterial color={RUBBER} roughness={0.8} metalness={0} />
      </mesh>
    </group>
  )
}

/** Pés em L presos ao teto da cavidade, com coxins de borracha sob a voluta. */
function Feet() {
  const floorY = -3.25 // y relativo do teto da cavidade (BAY.yBottom - BLOWER.y)
  const bottom = -R1 - 0.02
  const h = bottom - floorY
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.0, floorY + h / 2, -0.1]}>
            <boxGeometry args={[0.45, h, 0.9]} />
            <Metal color={C.metalDark} />
          </mesh>
          <mesh position={[s * 1.0, floorY + 0.04, -0.1]}>
            <boxGeometry args={[1.0, 0.08, 1.4]} />
            <Metal color={C.metalDark} />
          </mesh>
          <mesh position={[s * 1.0, bottom + 0.06, -0.1]}>
            <cylinderGeometry args={[0.28, 0.28, 0.12, 14]} />
            <meshStandardMaterial color={RUBBER} roughness={0.85} metalness={0} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function BlowerBody({ fan }: { fan: RefObject<THREE.Group> }) {
  const { band, front, back } = useScrollGeometries()
  return (
    <group position={[BLOWER.x, BLOWER.y, BLOWER.z]}>
      <mesh geometry={band}>
        <Metal />
      </mesh>
      <mesh geometry={front}>
        <Metal color={C.metal} roughness={0.45} />
      </mesh>
      <mesh geometry={back}>
        <Metal />
      </mesh>
      {/* boca de entrada com borda rolada e quatro rebites */}
      <mesh position={[0, 0, HALF_D + PLATE_T]}>
        <torusGeometry args={[1.02, 0.07, 8, 40]} />
        <Metal color={C.metal} roughness={0.35} metalness={0.7} />
      </mesh>
      {[0.8, 2.37, 3.94, 5.51].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 1.5, Math.sin(a) * 1.5, HALF_D + PLATE_T + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
          <Metal color={C.wire} roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
      {/* flange da saída, onde assenta o duto turbo */}
      <mesh position={[(R0 + R1) / 2, OUTLET_TOP + 0.03, 0]}>
        <boxGeometry args={[R1 - R0 + 0.4, 0.07, HALF_D * 2 + 0.2]} />
        <Metal color={C.metal} roughness={0.4} metalness={0.7} />
      </mesh>
      <Impeller fan={fan} />
      <Motor />
      <Feet />
    </group>
  )
}
