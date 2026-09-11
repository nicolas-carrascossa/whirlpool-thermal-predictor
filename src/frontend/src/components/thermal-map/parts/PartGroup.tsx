import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'

import { VARIABLE_COPY } from '@/contract/glossary_copy'

import { C } from '../materials'
import { useStove } from '../StoveContext'
import { PART_LABEL_PT, PART_TO_VARIABLE, type PartId } from './index'

/** Duração do pulso de destaque, em segundos (etapa C: peça alterada pisca ~1 s). */
const PULSE_SECONDS = 1

interface MaterialBase {
  hex: number
  intensity: number
}

function eachMaterial(root: THREE.Object3D, fn: (m: THREE.MeshStandardMaterial) => void) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined
    if (!mat) return
    const list = Array.isArray(mat) ? mat : [mat]
    for (const m of list) if (m && (m as THREE.MeshStandardMaterial).emissive) fn(m)
  })
}

interface PartGroupProps {
  partId: PartId
  children: ReactNode
  /** Posição local do tooltip dentro do grupo. */
  tooltipAt?: [number, number, number]
  /** `false` desliga o tooltip/hover (peças puramente decorativas). */
  interactive?: boolean
}

/**
 * Envelope comum das peças configuráveis: marca `userData.partId` /
 * `userData.variable` em todos os meshes, trata o hover com tooltip
 * "Variável: valor" e executa o pulso de destaque em `--wp-accent`.
 */
export function PartGroup({ partId, children, tooltipAt = [0, 0, 0], interactive = true }: PartGroupProps) {
  const { config, highlightPart, onHoverPart, reducedMotion } = useStove()
  const variable = PART_TO_VARIABLE[partId]
  const value = config[variable]
  const label = VARIABLE_COPY[variable]?.label_pt ?? PART_LABEL_PT[partId]

  const group = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  const pulse = useRef(0)
  const active = useRef(false)

  // Contorno `--wp-core` na peça sob o cursor (Fase 1d, etapa E) — além do
  // pulso emissivo/escala, um `EdgesGeometry` manual por mesh (equivalente ao
  // `<Edges>` do drei, que não aceita filhos arbitrários como os deste grupo).
  useEffect(() => {
    if (!hovered) return
    const root = group.current
    if (!root) return
    const added: THREE.LineSegments[] = []
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!(mesh instanceof THREE.Mesh) || !mesh.geometry) return
      const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 20)
      const line = new THREE.LineSegments(
        edgesGeometry,
        new THREE.LineBasicMaterial({ color: C.core, toneMapped: false }),
      )
      line.renderOrder = 999
      mesh.add(line)
      added.push(line)
    })
    return () => {
      for (const line of added) {
        line.parent?.remove(line)
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      }
    }
  }, [hovered])

  useEffect(() => {
    if (!group.current) return
    group.current.traverse((obj) => {
      obj.userData.partId = partId
      obj.userData.variable = variable
    })
  })

  useEffect(() => {
    if (highlightPart === partId) pulse.current = reducedMotion ? 0.35 : PULSE_SECONDS
  }, [highlightPart, partId, reducedMotion])

  useFrame((_, delta) => {
    const root = group.current
    if (!root) return
    if (pulse.current > 0) {
      pulse.current = Math.max(0, pulse.current - delta)
      const k = pulse.current / PULSE_SECONDS
      const wave = reducedMotion ? k : k * (0.55 + 0.45 * Math.sin(k * Math.PI * 4))
      if (!active.current) {
        active.current = true
        eachMaterial(root, (m) => {
          m.userData.__pulseBase = { hex: m.emissive.getHex(), intensity: m.emissiveIntensity } as MaterialBase
        })
      }
      eachMaterial(root, (m) => {
        m.emissive.set(C.accent)
        m.emissiveIntensity = Math.max(0, wave)
      })
    } else if (active.current) {
      active.current = false
      eachMaterial(root, (m) => {
        const base = m.userData.__pulseBase as MaterialBase | undefined
        if (!base) return
        m.emissive.setHex(base.hex)
        m.emissiveIntensity = base.intensity
        delete m.userData.__pulseBase
      })
    }
  })

  return (
    <group
      ref={group}
      onPointerOver={
        interactive
          ? (e) => {
              e.stopPropagation()
              setHovered(true)
              onHoverPart(partId)
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? (e) => {
              e.stopPropagation()
              setHovered(false)
              onHoverPart(null)
            }
          : undefined
      }
    >
      {children}
      {interactive && hovered && (
        <Html
          position={tooltipAt}
          center
          distanceFactor={22}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[12, 0]}
        >
          <div className="whitespace-nowrap rounded-md border border-wp-gray20 bg-white px-3 py-2 shadow-md">
            <p className="font-display text-sm font-semibold text-wp-gray85">{label}</p>
            <p className="tabular text-sm text-wp-core">{value}</p>
          </div>
        </Html>
      )}
    </group>
  )
}
