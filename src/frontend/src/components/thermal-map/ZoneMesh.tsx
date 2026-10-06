import { Edges, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { zoneSurface } from './detailTextures'
import { configureCfdHeatmap } from './cfdHeatmap'
import { useStove } from './StoveContext'
import type { ZoneMeshDef } from './zoneGeometry'

// Cores espelhadas de src/styles/tokens.css — three.js não lê CSS variables.
const OUTLINE_COLOR = '#0d436b' // --wp-core

interface ZoneMeshProps {
  def: ZoneMeshDef
  color: string
  isZoneActive: boolean
  onHoverZone: (key: string) => void
  onUnhoverZone: (key: string) => void
  onClickZone: (key: string) => void
  tooltip: React.ReactNode
}

/** Um mesh de zona (pode haver vários por `zoneKey`, ex.: os 5 knobs). */
export function ZoneMesh({
  def,
  color,
  isZoneActive,
  onHoverZone,
  onUnhoverZone,
  onClickZone,
  tooltip,
}: ZoneMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const [isPointerOver, setPointerOver] = useState(false)
  const [hoverEnabled, setHoverEnabled] = useState(false)
  const { view, clipPlanes, thermalMode } = useStove()
  const surface = useMemo(() => zoneSurface(def.surface), [def.surface])

  // Cor só é atualizada quando muda (não a cada frame) — evita recriar material.
  useEffect(() => {
    if (!matRef.current) return
    matRef.current.color.set(color)
    matRef.current.emissive.set(thermalMode ? '#000000' : color)
  }, [color, thermalMode])

  useEffect(() => {
    if (matRef.current) configureCfdHeatmap(matRef.current, thermalMode)
  }, [thermalMode])

  // Zonas que vivem na fachada do console são fatiadas junto com ela no modo
  // Corte; as demais (traseira, ventilação, interiores) nunca são cortadas.
  const clipped = Boolean(def.facade) && view === 'cutaway'
  useEffect(() => {
    if (!matRef.current) return
    matRef.current.clippingPlanes = clipped ? clipPlanes : null
    matRef.current.needsUpdate = true
  }, [clipped, clipPlanes])

  useFrame(() => {
    if (!meshRef.current || !matRef.current) return
    const targetScale = isZoneActive ? 1.06 : 1
    const targetEmissive = thermalMode ? 0 : isZoneActive ? 0.6 : 0.25
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2)
    matRef.current.emissiveIntensity += (targetEmissive - matRef.current.emissiveIntensity) * 0.2
  })

  const geometry =
    def.shape === 'box' ? (
      <boxGeometry args={def.args as [number, number, number]} />
    ) : def.shape === 'cylinder' ? (
      <cylinderGeometry args={def.args as [number, number, number, number]} />
    ) : (
      <torusGeometry args={def.args as [number, number, number, number]} />
    )

  return (
    <mesh
      ref={meshRef}
      userData={{ zoneKey: def.zoneKey }}
      position={def.position}
      rotation={def.rotation ?? [0, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!hoverEnabled) return
        setPointerOver(true)
        onHoverZone(def.zoneKey)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        setHoverEnabled(true)
        setPointerOver(true)
        onHoverZone(def.zoneKey)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        if (!hoverEnabled) return
        setPointerOver(false)
        onUnhoverZone(def.zoneKey)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClickZone(def.zoneKey)
      }}
    >
      {geometry}
      {/* `toneMapped={false}`: a cor da zona É o dado (status/calor/delta) — o
          ACES do rig de estúdio não pode lavá-la. */}
      {/* A textura (`surface`) só modula valor e relevo: `map` e `emissiveMap`
          são em tons de cinza, então a cor de status continua sendo o matiz. */}
      <meshStandardMaterial
        ref={matRef}
        roughness={0.55}
        metalness={0.12}
        toneMapped={false}
        map={surface?.map ?? null}
        emissiveMap={surface?.map ?? null}
        bumpMap={surface?.bump ?? null}
        bumpScale={0.6}
      />
      {isZoneActive && <Edges color={OUTLINE_COLOR} threshold={20} lineWidth={1} />}
      {isPointerOver && (
        <Html center distanceFactor={14} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          {tooltip}
        </Html>
      )}
    </mesh>
  )
}
