/**
 * Peças do sistema de ventilação principal (`Main Vent Sys`) além do blower:
 * o duto superior sob a fenda do cooktop (com aletas inclinadas e o ramal que
 * recebe o ar do blower), o duto turbo que sobe da saída do blower, o chicote
 * de sensores e os termopares dos sete pontos medidos — entrada do blower
 * (máx. e média), conector HES, enrolamentos, carcaça, entrada do duto superior
 * e saída do duto turbo.
 *
 * Decoração: a zona `Main Vent Sys` (a fenda) continua sendo a superfície de
 * dado. `TopDuct` entra na camada dos elementos (aparece sob o vidro na vista
 * explodida); `VentBayParts` entra na camada da baía, com o blower.
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { C } from './materials'
import { BAY, BLOWER } from './zoneGeometry'

type V3 = [number, number, number]

const DUCT_Y = 11.55
const DUCT_H = 0.9
const DUCT_Z = -5.0
const DUCT_W = 18.4
const DUCT_D = 2.28

/** Eixo do ramal que liga o duto superior à saída do blower, e sua largura. */
const BRANCH_X = BLOWER.x + 1.6
const BRANCH = { w: 0.8, zFront: -2.2 }

const WIRE_DARK = '#2e3033'
const WIRE_LIGHT = '#b9bcbf'
/** Fita Kapton, dessaturada: não compete com o dado. */
const TAPE = '#cfc3a6'
const NYLON = '#dcdad4'
const RUBBER = '#2b2d2f'

function Mat({ color, roughness = 0.5, metalness = 0.6 }: { color: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} side={THREE.DoubleSide} />
}

/** Fio em tubo fino por `points`; a geometria é descartada ao sair. */
function Lead({ points, color = WIRE_DARK, r = 0.04 }: { points: V3[]; color?: string; r?: number }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 28, r, 5, false),
    [points, r],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Mat color={color} roughness={0.8} metalness={0} />
    </mesh>
  )
}

interface ThermoSpec {
  bead: V3
  normal: 'x' | 'y' | 'z'
  /** Pontos do fio a partir da junta, até o chicote. */
  lead: V3[]
  /** `false` para junta solta no fluxo de ar (sem fita). */
  tape?: boolean
}

/**
 * Termopar tipo K: junta de metal presa à peça por um quadrado de fita, com o
 * par de fios (um escuro, um claro) correndo até o chicote. `normal` é o eixo da
 * face onde a fita assenta. As especificações são constantes de módulo: os
 * tubos dos fios só são recriados se uma delas mudar, não a cada render da cena.
 */
function Thermocouple({ bead, normal, lead, tape = true }: ThermoSpec) {
  const tapeArgs: V3 = normal === 'x' ? [0.012, 0.42, 0.32] : normal === 'y' ? [0.42, 0.012, 0.32] : [0.42, 0.32, 0.012]
  const darkWire = useMemo(() => [bead, ...lead], [bead, lead])
  const lightWire = useMemo(() => darkWire.map((p): V3 => [p[0] + 0.07, p[1], p[2] + 0.04]), [darkWire])
  return (
    <group>
      {tape && (
        <mesh position={bead}>
          <boxGeometry args={tapeArgs} />
          <Mat color={TAPE} roughness={0.7} metalness={0} />
        </mesh>
      )}
      <mesh position={bead}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <Mat color={C.wire} roughness={0.3} metalness={0.8} />
      </mesh>
      <Lead points={darkWire} color={WIRE_DARK} />
      <Lead points={lightWire} color={WIRE_LIGHT} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Duto superior (camada dos elementos)
 * ------------------------------------------------------------------ */

const BRANCH_Z = (DUCT_Z + DUCT_D / 2 + BRANCH.zFront) / 2
const TOP_DUCT_SENSOR: ThermoSpec = {
  bead: [BRANCH_X, DUCT_Y + DUCT_H / 2 + 0.08, BRANCH_Z + 0.2],
  normal: 'y',
  lead: [
    [BRANCH_X - 0.5, DUCT_Y + DUCT_H / 2 + 0.2, BRANCH_Z - 0.4],
    [BRANCH_X - 1.2, DUCT_Y + DUCT_H / 2 + 0.2, DUCT_Z + DUCT_D / 2 + 0.2],
    [-6.5, DUCT_Y + DUCT_H / 2 + 0.2, DUCT_Z + DUCT_D / 2 + 0.2],
  ],
}

const FIN_XS = Array.from({ length: 15 }, (_, i) => -8.4 + i * 1.2)

/**
 * Canal sob a fenda do cooktop: paredes, tampas laterais, piso, aletas
 * inclinadas que direcionam o ar para cima e abas de fixação do vidro. O ramal
 * à esquerda é por onde entra o ar que o duto turbo traz do blower.
 */
export function TopDuct() {
  const wall = { color: C.steelDark, roughness: 0.45, metalness: 0.7 }
  const branchD = BRANCH.zFront - (DUCT_Z + DUCT_D / 2)
  return (
    <group>
      {/* paredes de trás e da frente, tampas e piso */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, DUCT_Y, DUCT_Z + (s * DUCT_D) / 2]}>
          <boxGeometry args={[DUCT_W, DUCT_H, 0.08]} />
          <Mat {...wall} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * DUCT_W) / 2, DUCT_Y, DUCT_Z]}>
          <boxGeometry args={[0.08, DUCT_H, DUCT_D]} />
          <Mat {...wall} />
        </mesh>
      ))}
      <mesh position={[0, DUCT_Y - DUCT_H / 2 + 0.03, DUCT_Z]}>
        <boxGeometry args={[DUCT_W, 0.06, DUCT_D]} />
        <Mat {...wall} />
      </mesh>

      {/* aletas inclinadas, ao longo do canal */}
      {FIN_XS.map((x) => (
        <mesh key={x} position={[x, DUCT_Y, DUCT_Z]} rotation={[0, 0, 0.62]}>
          <boxGeometry args={[0.05, 0.74, DUCT_D - 0.3]} />
          <Mat color={C.metal} roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* abas de fixação do vidro nas bordas de cima, com parafusos */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, DUCT_Y + DUCT_H / 2, DUCT_Z + s * (DUCT_D / 2 + 0.12)]}>
            <boxGeometry args={[DUCT_W + 0.4, 0.05, 0.32]} />
            <Mat {...wall} />
          </mesh>
          {[-7.5, -2.5, 2.5, 7.5].map((x) => (
            <mesh key={x} position={[x, DUCT_Y + DUCT_H / 2 + 0.05, DUCT_Z + s * (DUCT_D / 2 + 0.12)]}>
              <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
              <Mat color={C.wire} roughness={0.35} metalness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ramal da entrada: caixa fechada que sai da parede da frente, sobre o duto turbo */}
      <mesh position={[BRANCH_X, DUCT_Y, BRANCH_Z]}>
        <boxGeometry args={[BRANCH.w, DUCT_H, branchD]} />
        <Mat {...wall} />
      </mesh>
      <mesh position={[BRANCH_X, DUCT_Y + DUCT_H / 2 + 0.03, BRANCH_Z]}>
        <boxGeometry args={[BRANCH.w + 0.3, 0.05, branchD + 0.2]} />
        <Mat {...wall} />
      </mesh>

      {/* sensor da entrada do duto superior, na aresta de cima do ramal */}
      <Thermocouple {...TOP_DUCT_SENSOR} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * Baía: duto turbo, chicote e termopares do blower
 * ------------------------------------------------------------------ */

const LOOM_Y = 6.2
const LOOM_Z = -6.3
const LOOM_XS = [-10, -6, 0, 6, 10]

/** Duto turbo: sobe da saída do blower até a face de baixo da bandeja. */
export function TurboDuct() {
  const outletTop = BLOWER.y + 1.95 + 0.06
  const trayUnder = BAY.yTop
  const h = trayUnder - outletTop
  return (
    <group>
      <mesh position={[BRANCH_X, outletTop + h / 2, BLOWER.z]}>
        <boxGeometry args={[0.7, h, 1.35]} />
        <Mat color={C.metalDark} />
      </mesh>
      {/* nervuras de reforço do duto */}
      {[0.25, 0.5, 0.75].map((f) => (
        <mesh key={f} position={[BRANCH_X, outletTop + h * f, BLOWER.z]}>
          <boxGeometry args={[0.8, 0.05, 1.45]} />
          <Mat color={C.metal} roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      {/* flange de topo, parafusada à bandeja */}
      <mesh position={[BRANCH_X, trayUnder - 0.03, BLOWER.z]}>
        <boxGeometry args={[1.4, 0.06, 2.0]} />
        <Mat color={C.metal} roughness={0.4} metalness={0.7} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[BRANCH_X + sx * 0.52, trayUnder - 0.08, BLOWER.z + sz * 0.8]}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 8]} />
            <Mat color={C.wire} roughness={0.35} metalness={0.8} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** Feixe de sensores, preso ao teto da cavidade por três postes com braçadeira. */
function Loom() {
  const points = useMemo<V3[]>(
    () => LOOM_XS.map((x, i) => [x, LOOM_Y + (i % 2 === 0 ? 0.08 : -0.06), LOOM_Z] as V3),
    [],
  )
  return (
    <group>
      <Lead points={points} color={WIRE_DARK} r={0.2} />
      {[-7, 0, 7].map((x) => (
        <group key={x}>
          <mesh position={[x, (BAY.yBottom + LOOM_Y) / 2 - 0.1, LOOM_Z]}>
            <cylinderGeometry args={[0.1, 0.1, LOOM_Y - BAY.yBottom - 0.2, 8]} />
            <Mat color={C.metalDark} />
          </mesh>
          <mesh position={[x, LOOM_Y, LOOM_Z]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.24, 0.05, 6, 16]} />
            <Mat color={NYLON} roughness={0.7} metalness={0} />
          </mesh>
          <mesh position={[x, BAY.yBottom + 0.03, LOOM_Z]}>
            <boxGeometry args={[0.7, 0.06, 0.7]} />
            <Mat color={C.metalDark} />
          </mesh>
        </group>
      ))}
      {/* conector de saída do feixe, na ponta direita */}
      <mesh position={[10.3, LOOM_Y - 0.06, LOOM_Z]}>
        <boxGeometry args={[0.7, 0.45, 0.55]} />
        <Mat color={NYLON} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[10.66, LOOM_Y - 0.06, LOOM_Z]}>
        <boxGeometry args={[0.02, 0.28, 0.4]} />
        <Mat color={RUBBER} roughness={0.8} metalness={0} />
      </mesh>
    </group>
  )
}

/** Termopares do blower; os fios descem pelo vão até o feixe (`Loom`). */
const BAY_SENSORS: ThermoSpec[] = (() => {
  const { x: bx, y: by, z: bz } = BLOWER
  return [
    // entrada do blower, máxima e média: soltas no fluxo, logo à frente da boca
    {
      bead: [bx - 0.55, by + 0.6, bz + 1.0],
      normal: 'z',
      tape: false,
      lead: [[bx - 1.6, by + 0.9, bz + 0.9], [bx - 2.7, by + 0.2, bz + 0.5], [bx - 3.2, LOOM_Y + 0.4, bz - 2], [bx - 3.1, LOOM_Y, LOOM_Z]],
    },
    {
      bead: [bx + 0.5, by - 0.5, bz + 1.0],
      normal: 'z',
      tape: false,
      lead: [[bx + 0.4, by - 1.5, bz + 1.0], [bx + 0.9, by - 2.2, bz - 0.5], [bx + 1.8, LOOM_Y + 0.2, bz - 2.3], [bx + 2.6, LOOM_Y, LOOM_Z]],
    },
    // conector HES: sobre o corpo de nylon do conector Hall do motor
    {
      bead: [bx + 0.92, by + 0.5, bz - 1.38],
      normal: 'y',
      lead: [[bx + 1.3, by + 0.2, bz - 1.9], [bx + 1.6, by - 0.8, bz - 2.8], [bx + 1.8, LOOM_Y + 0.1, LOOM_Z + 0.4], [bx + 1.5, LOOM_Y, LOOM_Z]],
    },
    // enrolamentos: junta presa ao anel de cobre do lado da voluta
    {
      bead: [bx - 0.58, by - 0.2, bz - 0.78],
      normal: 'x',
      lead: [[bx - 1.0, by - 0.9, bz - 1.4], [bx - 1.2, by - 1.9, bz - 2.4], [bx - 1.0, LOOM_Y + 0.1, LOOM_Z + 0.5], [bx - 0.6, LOOM_Y, LOOM_Z]],
    },
    // carcaça: fita sobre a parede externa da voluta, à esquerda
    {
      bead: [bx - 1.62, by, bz],
      normal: 'x',
      lead: [[bx - 1.8, by - 0.6, bz - 0.4], [bx - 2.1, by - 1.6, bz - 1.6], [bx - 2.0, LOOM_Y + 0.1, LOOM_Z + 0.6], [bx - 1.9, LOOM_Y, LOOM_Z]],
    },
    // saída do blower / duto turbo: fita na face da frente do duto
    {
      bead: [BRANCH_X, by + 2.4, bz + 0.72],
      normal: 'z',
      lead: [[BRANCH_X + 0.5, by + 1.9, bz + 0.9], [BRANCH_X + 1.4, by + 0.4, bz - 1.0], [BRANCH_X + 2.0, LOOM_Y + 0.2, LOOM_Z + 1.0], [BRANCH_X + 2.4, LOOM_Y, LOOM_Z]],
    },
  ]
})()

export function VentBayParts() {
  return (
    <group>
      <TurboDuct />
      <Loom />
      {BAY_SENSORS.map((spec, i) => (
        <Thermocouple key={i} {...spec} />
      ))}
    </group>
  )
}
