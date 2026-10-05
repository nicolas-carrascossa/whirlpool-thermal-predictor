/**
 * Interior do console, atrás dos botões (`CT Knobs`). Os sensores desta zona
 * são encoders e o ambiente entre eles — então o que há ali é uma placa de
 * encoders: cada botão gira o eixo de um encoder rotativo, preso à placa por
 * uma bucha com porca, com os termistores de ambiente entre os pares, um
 * conector e o chicote que desce para a eletrônica. No produto de referência
 * (KitchenAid) há ainda a lente do indicador de superfície quente no centro.
 *
 * Tudo é decoração presa à tampa do console: sobe com ela em "Abrir console" e
 * na vista explodida, e aparece por trás quando o painel traseiro recua. As
 * zonas dos botões (dado) não são tocadas — só o que está atrás delas.
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { knobBoardTexture } from './detailTextures'
import { C, ShellMaterial } from './materials'
import { BACKSPLASH, CONSOLE, KNOB_XS } from './zoneGeometry'

const Y = CONSOLE.yCenter
/** Face frontal da tampa (z) e a face de trás do painel traseiro do console. */
const FACE_BACK_Z = CONSOLE.zFront - 0.4
const PANEL_FRONT_Z = CONSOLE.zBack + 0.5

const BOARD = { w: BACKSPLASH.w - 0.9, h: 2.9, t: 0.12, z: FACE_BACK_Z - 0.75 }
const BOARD_FRONT_Z = BOARD.z + BOARD.t / 2
const BOARD_BACK_Z = BOARD.z - BOARD.t / 2

/** X do centro da faixa de comando: entre os botões da esquerda e os da direita. */
const CENTER_X = (KNOB_XS[1] + KNOB_XS[2]) / 2
const NYLON = '#dcdad4'
const SOLDER = C.wire
const WIRE_DARK = '#2e3033'

/** Material do interior: opaco em Raio-X (é o que o modo existe para mostrar) e sem corte. */
function Mat({ color, roughness = 0.5, metalness = 0.2 }: { color: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
}

/** Cilindro deitado em Z, de `z0` a `z1` (qualquer ordem). */
function ZCylinder({
  x,
  y,
  z0,
  z1,
  r,
  color,
  segments = 16,
  roughness = 0.4,
  metalness = 0.8,
  shell = false,
}: {
  x: number
  y: number
  z0: number
  z1: number
  r: number
  color: string
  segments?: number
  roughness?: number
  metalness?: number
  /** `true` para peças da tampa (seguem Raio-X/Corte); as do interior ficam opacas. */
  shell?: boolean
}) {
  return (
    <mesh position={[x, y, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[r, r, Math.abs(z1 - z0), segments]} />
      {shell ? (
        <ShellMaterial color={color} roughness={roughness} metalness={metalness} />
      ) : (
        <Mat color={color} roughness={roughness} metalness={metalness} />
      )}
    </mesh>
  )
}

/**
 * Encoder rotativo: corpo na placa, porca sextavada, bucha roscada que atravessa
 * a tampa e o eixo que entra no botão. Três pinos saem pelo verso da placa.
 */
function Encoder({ x }: { x: number }) {
  const bodyFront = BOARD_FRONT_Z + 0.42
  const nutFront = bodyFront + 0.17
  return (
    <group>
      <ZCylinder x={x} y={Y} z0={BOARD_FRONT_Z} z1={bodyFront} r={0.6} color={C.metalDark} segments={20} />
      <ZCylinder x={x} y={Y} z0={bodyFront} z1={nutFront} r={0.5} color={C.wire} segments={6} />
      <ZCylinder x={x} y={Y} z0={nutFront} z1={CONSOLE.zFront} r={0.3} color={C.metal} />
      <ZCylinder x={x} y={Y} z0={bodyFront} z1={CONSOLE.zFront + 0.7} r={0.16} color={C.dark} segments={10} />
      {[-0.25, 0, 0.25].map((dx) => (
        <ZCylinder key={dx} x={x + dx} y={Y - 0.7} z0={BOARD_BACK_Z} z1={BOARD_BACK_Z - 0.3} r={0.035} color={SOLDER} segments={6} />
      ))}
    </group>
  )
}

/** Termistor de ambiente: bolinha de epóxi em dois fios curtos presos à placa. */
function Thermistor({ x, y }: { x: number; y: number }) {
  const z = BOARD_FRONT_Z + 0.65
  return (
    <group>
      {[-0.06, 0.06].map((dx) => (
        <ZCylinder key={dx} x={x + dx} y={y} z0={BOARD_FRONT_Z} z1={z} r={0.018} color={SOLDER} segments={5} />
      ))}
      <mesh position={[x, y, z + 0.08]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <Mat color={C.dark} />
      </mesh>
    </group>
  )
}

/** Chicote em tubo: curva suave por `points`, com a geometria descartada ao sair. */
function Wire({ points, r, color }: { points: [number, number, number][]; r: number; color: string }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 24, r, 6, false),
    [points, r],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Mat color={color} roughness={0.8} metalness={0} />
    </mesh>
  )
}

const HARNESS_Y = Y - 1.75
const HARNESS_Z = BOARD_BACK_Z - 0.42
const HARNESS: [number, number, number][] = [
  [-11.2, HARNESS_Y + 0.2, HARNESS_Z],
  [-6, HARNESS_Y - 0.08, HARNESS_Z],
  [0, HARNESS_Y + 0.06, HARNESS_Z],
  [6, HARNESS_Y - 0.08, HARNESS_Z],
  [11.2, HARNESS_Y + 0.15, HARNESS_Z],
]

export function ConsoleInternals() {
  const pcb = useMemo(() => knobBoardTexture(), [])
  // x dos termistores: no vão entre os dois botões da esquerda e entre os da direita
  const ambientXs = [(KNOB_XS[0] + KNOB_XS[1]) / 2, (KNOB_XS[2] + KNOB_XS[3]) / 2, (KNOB_XS[3] + KNOB_XS[4]) / 2]
  const standoffLen = BOARD_BACK_Z - PANEL_FRONT_Z
  return (
    <group>
      {/* placa dos encoders: uma tira que corre atrás dos cinco botões */}
      <mesh position={[0, Y, BOARD.z]}>
        <boxGeometry args={[BOARD.w, BOARD.h, BOARD.t]} />
        <meshStandardMaterial color={pcb ? '#ffffff' : C.pcb} map={pcb} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* espaçadores entre a placa e o painel traseiro do console */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <ZCylinder
            key={`${sx}${sy}`}
            x={sx * (BOARD.w / 2 - 0.35)}
            y={Y + sy * (BOARD.h / 2 - 0.3)}
            z0={BOARD_BACK_Z}
            z1={BOARD_BACK_Z - standoffLen}
            r={0.12}
            color={C.wire}
            segments={8}
          />
        )),
      )}

      {KNOB_XS.map((x) => (
        <Encoder key={x} x={x} />
      ))}
      {ambientXs.map((x) => (
        <Thermistor key={x} x={x} y={Y + 0.95} />
      ))}

      {/* conector da placa: cabeça de nylon com a janela dos terminais */}
      <mesh position={[CENTER_X, Y + 0.5, BOARD_FRONT_Z + 0.25]}>
        <boxGeometry args={[2.0, 0.55, 0.5]} />
        <Mat color={NYLON} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[CENTER_X, Y + 0.5, BOARD_FRONT_Z + 0.51]}>
        <boxGeometry args={[1.6, 0.2, 0.04]} />
        <Mat color={WIRE_DARK} roughness={0.8} metalness={0} />
      </mesh>
      {/* LED do indicador, atrás da lente da tampa */}
      <mesh position={[CENTER_X, Y - 0.5, BOARD_FRONT_Z + 0.08]}>
        <boxGeometry args={[0.3, 0.3, 0.16]} />
        <Mat color={NYLON} roughness={0.5} metalness={0} />
      </mesh>

      {/* chicote: feixe principal pelo verso da placa e um ramal por encoder */}
      <Wire points={HARNESS} r={0.15} color={WIRE_DARK} />
      {KNOB_XS.map((x) => (
        <ZCylinder key={x} x={x} y={Y - 1.05} z0={BOARD_BACK_Z - 0.28} z1={HARNESS_Z} r={0.04} color={WIRE_DARK} segments={6} roughness={0.8} metalness={0} />
      ))}
      {/* abraçadeiras do feixe */}
      {[-8.5, -2.5, 3.5, 9].map((x) => (
        <mesh key={x} position={[x, HARNESS_Y, HARNESS_Z]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.18, 0.035, 6, 14]} />
          <Mat color={NYLON} roughness={0.7} metalness={0} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Lente do indicador de superfície quente, na faixa de comando entre os botões
 * da esquerda e da direita (onde antes ficava o display): aro de aço e lente
 * fosca rente à face da tampa. Fica na tampa, não na placa.
 */
export function HotSurfaceLens() {
  // a faixa de comando em grafite assenta em `zFront + 0.1` com 0,22 de espessura
  const z = CONSOLE.zFront + 0.21
  return (
    <group>
      <ZCylinder x={CENTER_X} y={Y} z0={z} z1={z + 0.07} r={0.55} color={C.steelDark} segments={24} roughness={0.3} shell />
      <ZCylinder x={CENTER_X} y={Y} z0={z + 0.07} z1={z + 0.12} r={0.38} color="#e6e4df" segments={24} roughness={0.55} metalness={0} shell />
    </group>
  )
}
