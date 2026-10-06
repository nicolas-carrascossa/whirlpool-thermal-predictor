/**
 * Tela do forno na faixa frontal, entre a porta e o cooktop — o arranjo do
 * KitchenAid KOES630SPS: lâmina de vidro preto, ícones de início (esq.) e
 * cancelar (dir.) em contorno e, no centro, o display com hora e data.
 *
 * Só decoração em volta e sobre a zona `Oven HMI`: o display em si é o box da
 * zona (`ZoneMesh`), que carrega a cor de status e recebe hover/clique. Tudo
 * aqui é rente à lâmina e **não** intercepta o raio — os cliques atravessam
 * para a zona.
 */
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

import { hmiClockTexture, hmiGlassTexture } from './detailTextures'
import { C, ShellMaterial } from './materials'
import { useStove } from './StoveContext'
import { BODY_FRONT, HMI_SCREEN } from './zoneGeometry'

const { y, w, h, glassW, glassH, glassT, proud, knobX } = HMI_SCREEN

/** Raio e altura dos botões: os mesmos dos cilindros da zona `CT Knobs`. */
const KNOB_R = 0.95
const KNOB_H = 0.9

/** Distância dos ícones ao centro: no meio da faixa entre o display e a borda. */
const ICON_X = (w / 2 + glassW / 2) / 2
/** Espessura do filete de aço em volta da lâmina. */
const RIM = 0.16

const noRaycast = () => null

/** Plano translúcido rente à tela: seguem o modo (Raio-X, Corte) das peças vizinhas. */
function Overlay({ map, width, height, z }: { map: THREE.Texture | null; width: number; height: number; z: number }) {
  const { view, clipPlanes } = useStove()
  if (!map) return null
  return (
    <mesh position={[0, y, z]} raycast={noRaycast} renderOrder={2}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={map}
        transparent
        opacity={view === 'xray' ? 0.15 : 1}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
        clippingPlanes={view === 'cutaway' ? clipPlanes : null}
      />
    </mesh>
  )
}

/** Hora e data atuais; a textura só é refeita quando o minuto muda. */
function useClockTexture() {
  const currentMinute = () => Math.floor(Date.now() / 60_000)
  const [minute, setMinute] = useState(currentMinute)
  useEffect(() => {
    const id = window.setInterval(() => setMinute(currentMinute()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  const texture = useMemo(() => hmiClockTexture(w, h, new Date(minute * 60_000)), [minute])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

/**
 * Botão de comando do forno, ao lado da tela: o mesmo desenho dos botões do
 * console (`CT Knobs`) — arruela rasa, cilindro com tampa e marca em D — mas
 * em aço, decoração sem dado. Fica à frente da face do corpo, deitado em Z.
 */
function FrontKnob({ x }: { x: number }) {
  const metal = { roughness: 0.25, metalness: 0.85 }
  return (
    <group position={[x, y, BODY_FRONT]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.07, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[KNOB_R + 0.32, KNOB_R + 0.32, 0.14, 28]} />
        <ShellMaterial color={C.steelDark} {...metal} />
      </mesh>
      <mesh position={[0, 0.14 + KNOB_H / 2, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[KNOB_R, KNOB_R, KNOB_H, 28]} />
        <ShellMaterial color={C.steel} {...metal} />
      </mesh>
      {/* tampa rebaixada com aro, e a marca em D que indica a posição */}
      <mesh position={[0, 0.14 + KNOB_H + 0.02, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[KNOB_R * 0.78, KNOB_R * 0.78, 0.05, 28]} />
        <ShellMaterial color={C.steelDark} {...metal} />
      </mesh>
      <mesh position={[0, 0.14 + KNOB_H + 0.07, -KNOB_R * 0.28]} raycast={noRaycast}>
        <boxGeometry args={[0.22, 0.06, KNOB_R * 0.6]} />
        <ShellMaterial color={C.bodyLight} roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  )
}

export function HmiScreen() {
  const glass = useMemo(() => hmiGlassTexture(glassW, glassH, ICON_X), [])
  const clock = useClockTexture()

  const frontZ = BODY_FRONT + glassT
  const rimZ = BODY_FRONT + (glassT + 0.08) / 2
  const rim = { color: C.steelDark, roughness: 0.3, metalness: 0.85 }
  return (
    <group>
      {/* lâmina de vidro preto: ligeiramente brilhante, rente à moldura */}
      <mesh position={[0, y, BODY_FRONT + glassT / 2]} raycast={noRaycast}>
        <boxGeometry args={[glassW, glassH, glassT]} />
        <ShellMaterial color={C.screen} roughness={0.14} metalness={0.55} />
      </mesh>
      {/* filete de aço em volta, como a borda da lâmina */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, y + (s * (glassH + RIM)) / 2, rimZ]} raycast={noRaycast}>
            <boxGeometry args={[glassW + RIM * 2, RIM, glassT + 0.08]} />
            <ShellMaterial {...rim} />
          </mesh>
          <mesh position={[(s * (glassW + RIM)) / 2, y, rimZ]} raycast={noRaycast}>
            <boxGeometry args={[RIM, glassH, glassT + 0.08]} />
            <ShellMaterial {...rim} />
          </mesh>
        </group>
      ))}
      {/* botões de comando nas duas laterais da tela */}
      <FrontKnob x={-knobX} />
      <FrontKnob x={knobX} />
      {/* ícones de início e cancelar + reflexo do vidro */}
      <Overlay map={glass} width={glassW} height={glassH} z={frontZ + 0.012} />
      {/* hora e data sobre o display (que é a zona de dado) */}
      <Overlay map={clock} width={w} height={h} z={frontZ + proud + 0.012} />
    </group>
  )
}
