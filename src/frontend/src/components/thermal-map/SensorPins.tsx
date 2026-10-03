/**
 * Pinos de sensor sobre as zonas — Fase 1d, etapa C.
 *
 * Aparecem os sensores em atenção/excesso de qualquer zona **mais** todos os
 * sensores da zona selecionada. O clique leva à linha correspondente da tabela
 * de resultados (`onSelectSensor`).
 */

import { Html } from '@react-three/drei'
import { useState } from 'react'
import * as THREE from 'three'

import type { SensorPrediction } from '@/contract/v1'
import { formatPct, formatTemp } from '@/lib/format'
import { ratioOf, statusOf, type SensorStatus } from '@/lib/status'

import { PIN_RADIUS, pinPositionsForZone } from './pins'
import { zoneBounds } from './zoneGeometry'

/** Raio da esfera invisível que recebe o clique/hover do pino. */
const PIN_HIT_RADIUS = PIN_RADIUS * 2.8

/** Cores espelhadas de `src/styles/tokens.css`. */
const PIN_COLOR: Record<SensorStatus, string> = {
  ok: '#5aa469',
  warn: '#f4a63c',
  danger: '#cf5f57',
  monitor: '#9fa0a1',
}

export interface SensorPin {
  sensor: SensorPrediction
  position: [number, number, number]
}

/** "IGBT 1 · 241,5 °C / 150,0 °C (161 %)" · monitores sem limite. */
export function pinTooltipText(p: SensorPrediction): string {
  if (p.active_limit_c === null) return `${p.tc_name} · ${formatTemp(p.temp_c)} · monitor`
  const ratio = ratioOf(p)
  return `${p.tc_name} · ${formatTemp(p.temp_c)} / ${formatTemp(p.active_limit_c)} (${formatPct(
    (ratio ?? 0) * 100,
    0,
  )})`
}

/**
 * Monta a lista de pinos visíveis. A posição de um sensor depende do seu
 * índice **dentro da área inteira** (ordenada por `tc_number`), não do recorte
 * exibido — assim um pino não muda de lugar quando o filtro muda.
 */
export function buildSensorPins(
  predictions: SensorPrediction[],
  selectedKeyArea: string | null,
): SensorPin[] {
  const byArea = new Map<string, SensorPrediction[]>()
  for (const p of predictions) {
    const arr = byArea.get(p.key_area)
    if (arr) arr.push(p)
    else byArea.set(p.key_area, [p])
  }

  const pins: SensorPin[] = []
  for (const [area, sensors] of byArea) {
    if (!zoneBounds(area)) continue
    const ordered = [...sensors].sort((a, b) => a.tc_number - b.tc_number)
    const positions = pinPositionsForZone(area, ordered.length)
    ordered.forEach((sensor, i) => {
      const status = statusOf(sensor)
      const isAlert = status === 'warn' || status === 'danger'
      if (!isAlert && selectedKeyArea !== area) return
      const position = positions[i]
      if (position) pins.push({ sensor, position })
    })
  }
  return pins
}

function Pin({
  pin,
  onSelectSensor,
}: {
  pin: SensorPin
  onSelectSensor?: (tcNumber: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [hoverEnabled, setHoverEnabled] = useState(false)
  const status = statusOf(pin.sensor)
  const color = PIN_COLOR[status]

  return (
    <group position={pin.position}>
      {/* alvo invisível: o pino tem ~6 px na tela e seria quase impossível de
          acertar; o raycast usa esta esfera maior, que não pinta nada */}
      <mesh
        userData={{ tcNumber: pin.sensor.tc_number }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!hoverEnabled) return
          setHovered(true)
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          setHoverEnabled(true)
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          if (!hoverEnabled) return
          setHovered(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelectSensor?.(pin.sensor.tc_number)
        }}
      >
        <sphereGeometry args={[PIN_HIT_RADIUS, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh scale={hovered ? 1.45 : 1} raycast={() => null}>
        <sphereGeometry args={[PIN_RADIUS, 14, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.45}
          toneMapped={false}
        />
      </mesh>
      {/* halo branco (casca invertida): sem ele um pino vermelho sobre uma zona
          vermelha — o caso mais importante — desaparece */}
      <mesh scale={hovered ? 1.45 : 1} raycast={() => null}>
        <sphereGeometry args={[PIN_RADIUS * 1.35, 14, 12]} />
        <meshBasicMaterial color="#ffffff" side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {hovered && (
        <Html center position={[0, 1.1, 0]} zIndexRange={[30, 20]} style={{ pointerEvents: 'none' }}>
          <div className="tabular whitespace-nowrap rounded-md border border-wp-gray20 bg-white px-2 py-1 font-body text-[12px] text-wp-gray85 shadow-md">
            {pinTooltipText(pin.sensor)}
          </div>
        </Html>
      )}
    </group>
  )
}

export function SensorPins({
  pins,
  onSelectSensor,
}: {
  pins: SensorPin[]
  onSelectSensor?: (tcNumber: number) => void
}) {
  return (
    <group>
      {pins.map((pin) => (
        <Pin key={pin.sensor.tc_number} pin={pin} onSelectSensor={onSelectSensor} />
      ))}
    </group>
  )
}
