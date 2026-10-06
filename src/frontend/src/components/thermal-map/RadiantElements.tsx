/**
 * Camada dos elementos radiantes do cooktop, desenhada do manual de serviço:
 * cada elemento é um prato raso de chapa com aba, forrado de fibra cerâmica,
 * com a resistência em espiral (fita ondulada) por cima, a sonda do limitador
 * de temperatura atravessando o prato, o bloco de terminais na borda e três
 * garras de fixação. A zona expansível (anel duplo) ganha uma segunda espiral
 * e o anel divisor entre as duas.
 *
 * É o que se vê sob o vidro na vista explodida e com o cooktop levantado — e
 * onde a resistência acesa brilha (`CooktopGlow`). Decoração: nenhuma peça
 * daqui é zona de dado.
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { C, ShellMaterial } from './materials'
import { BURNER_SLOTS, COOKTOP_ELEMENTS, COOKTOP_STACK } from './zoneGeometry'

/** Passo entre espiras e raio do fio: valores de vitrocerâmica de 30". */
const PITCH = 0.3
const WIRE_R = 0.065
/** Fibra cerâmica do fundo do prato: o claro que destaca a espiral escura. */
const INSULATION = '#d6d3cd'
const COIL_STEEL = '#55585a'

/** Espiral de Arquimedes com ondulação vertical: a fita corrugada da resistência. */
function buildSpiral(rIn: number, rOut: number): THREE.BufferGeometry {
  const turns = Math.max(1, (rOut - rIn) / PITCH)
  const steps = Math.ceil(turns * 40)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = t * turns * Math.PI * 2
    const r = rIn + (rOut - rIn) * t
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 14) * 0.035, Math.sin(a) * r))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps * 3, WIRE_R, 5, false)
}

function Spiral({ rIn, rOut, y }: { rIn: number; rOut: number; y: number }) {
  const geometry = useMemo(() => buildSpiral(rIn, rOut), [rIn, rOut])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    // a fita é mais alta que larga: estica só em Y
    <mesh geometry={geometry} position={[0, y, 0]} scale={[1, 1.7, 1]}>
      <ShellMaterial color={COIL_STEEL} roughness={0.42} metalness={0.7} clip={false} />
    </mesh>
  )
}

function Element({ x, z, index }: { x: number; z: number; index: number }) {
  const { elementsY, reflectorY } = COOKTOP_STACK
  const { radius: r, innerRadius } = COOKTOP_ELEMENTS[index]
  const dishR = r + 0.3
  const rimH = 0.44
  // a sonda e o bloco de terminais saem do lado de fora do cooktop
  const side = x < 0 ? Math.PI : 0
  const metal = { clip: false, roughness: 0.4, metalness: 0.7 }
  return (
    <group position={[x, 0, z]}>
      {/* prato: fundo + aba (tubo aberto) + fibra cerâmica */}
      <mesh position={[0, reflectorY, 0]}>
        <cylinderGeometry args={[dishR, dishR, 0.12, 40]} />
        <ShellMaterial color={C.metal} {...metal} />
      </mesh>
      <mesh position={[0, reflectorY + 0.06 + rimH / 2 - 0.06, 0]}>
        <cylinderGeometry args={[dishR, dishR, rimH, 40, 1, true]} />
        <ShellMaterial color={C.metal} {...metal} />
      </mesh>
      <mesh position={[0, reflectorY + 0.14, 0]}>
        <cylinderGeometry args={[r + 0.15, r + 0.15, 0.16, 40]} />
        <ShellMaterial color={INSULATION} roughness={1} metalness={0} clip={false} />
      </mesh>

      {/* resistência: espiral única, ou duas separadas pelo anel divisor */}
      {innerRadius === undefined ? (
        <Spiral rIn={0.25} rOut={r - 0.35} y={elementsY} />
      ) : (
        <>
          <Spiral rIn={0.2} rOut={innerRadius - 0.25} y={elementsY} />
          <Spiral rIn={innerRadius + 0.25} rOut={r - 0.35} y={elementsY} />
          <mesh position={[0, elementsY - 0.04, 0]}>
            <cylinderGeometry args={[innerRadius, innerRadius, 0.26, 36, 1, true]} />
            <ShellMaterial color={C.metal} {...metal} />
          </mesh>
        </>
      )}

      {/* sonda do limitador de temperatura: haste reta, de borda a borda do prato */}
      <group rotation={[0, side, 0]}>
        <mesh position={[0, elementsY + 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, r * 1.7, 8]} />
          <ShellMaterial color={C.wire} roughness={0.3} metalness={0.85} clip={false} />
        </mesh>
        {/* cabeça da sonda, do lado de fora da aba */}
        <mesh position={[dishR + 0.25, elementsY + 0.2, 0]}>
          <boxGeometry args={[0.6, 0.3, 0.34]} />
          <ShellMaterial color={C.dark} roughness={0.6} metalness={0.3} clip={false} />
        </mesh>

        {/* bloco de terminais: cerâmica clara com dois parafusos de aço */}
        <group position={[dishR * Math.cos(0.9) + 0.25, reflectorY + 0.2, dishR * Math.sin(0.9)]} rotation={[0, -0.9, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.3, 0.9]} />
            <ShellMaterial color={INSULATION} roughness={0.9} metalness={0} clip={false} />
          </mesh>
          {[-0.24, 0.24].map((dz) => (
            <mesh key={dz} position={[0, 0.2, dz]}>
              <cylinderGeometry args={[0.09, 0.09, 0.14, 8]} />
              <ShellMaterial color={C.wire} roughness={0.3} metalness={0.85} clip={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* garras de fixação do prato, a 120° */}
      {[0.4, 0.4 + (Math.PI * 2) / 3, 0.4 + (Math.PI * 4) / 3].map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * dishR, reflectorY + rimH - 0.05, Math.sin(a) * dishR]}
          rotation={[0, -a, 0]}
        >
          <boxGeometry args={[0.45, 0.1, 0.22]} />
          <ShellMaterial color={C.wire} roughness={0.3} metalness={0.85} clip={false} />
        </mesh>
      ))}
    </group>
  )
}

export function RadiantElements() {
  return (
    <group>
      {BURNER_SLOTS.map(([x, z], i) => (
        <Element key={i} x={x} z={z} index={i} />
      ))}
    </group>
  )
}
