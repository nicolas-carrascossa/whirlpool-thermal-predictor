/**
 * Canvas único das figuras 3D da faixa de áreas.
 *
 * Sete miniaturas não justificam sete contextos WebGL, então a faixa tem **um**
 * canvas por cima dela, com câmera ortográfica em pixels de tela: cada figura é
 * posicionada no centro do seu quadrado (medido no DOM por quem usa este
 * componente) e escalada para caber nele. O canvas não recebe cliques; o hover
 * e o foco continuam sendo do cartão.
 *
 * Em repouso nada é redesenhado (`frameloop="demand"`): só nos primeiros
 * instantes, enquanto as peças assentam nos estados de repouso, e enquanto uma
 * figura gira ou muda de tamanho.
 *
 * Carregado sob demanda (`React.lazy`) porque traz `three` e `@react-three/*`.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import {
  AREA_FIGURES,
  FIGURE_CONFIG,
  REST_TILT_DEG,
  figureCenter,
  figureFit,
  type AreaFigureSpec,
} from './AreaFigures'
import { DEFAULT_CUT_DEPTH } from './cutPlane'
import { partStateFromConfig } from './parts'
import { DEFAULT_OPENINGS, StoveProvider, type StoveContextValue } from './StoveContext'

/** Onde, dentro do canvas, fica uma figura: centro do quadrado e lado dele, em px. */
export interface FigurePlacement {
  area: string
  /** Mouse/foco/seleção no cartão: a figura cresce e gira. */
  active: boolean
  cx: number
  cy: number
  /** Lado do quadrado reservado para a figura. */
  size: number
  /** Largura do cartão: limita o quanto a figura pode crescer ao girar. */
  tileWidth: number
}

export interface AreaFiguresCanvasProps {
  placements: FigurePlacement[]
  /** Sem giro nem animação de tamanho (`prefers-reduced-motion`). */
  reducedMotion: boolean
}

const SPIN_DEG_PER_SEC = 140
const ACTIVE_SCALE = 1.22
/** Os primeiros segundos pedem quadros: as peças assentam por amortecimento. */
const SETTLE_SECONDS = 1.6

const noop = () => {}
const DEG = Math.PI / 180

function Lights() {
  // O mesmo rig de estúdio do mapa 3D (`ThermalMapScene`).
  return (
    <>
      <hemisphereLight args={[0xffffff, 0xdee0e3, 0.6]} />
      <directionalLight color={0xfff4e6} intensity={1.1} position={[22, 30, 18]} />
      <directionalLight color={0xffffff} intensity={0.35} position={[-24, 14, 18]} />
      <directionalLight color={0xffffff} intensity={0.3} position={[0, 14, -30]} />
    </>
  )
}

/** Mantém o canvas desenhando enquanto as peças assentam nos estados de repouso. */
function SettleDriver() {
  useFrame((state) => {
    if (state.clock.elapsedTime < SETTLE_SECONDS) state.invalidate()
  })
  return null
}

function Figure({
  spec,
  placement,
  reducedMotion,
}: {
  spec: AreaFigureSpec
  placement: FigurePlacement
  reducedMotion: boolean
}) {
  const { area, active, cx, cy, size, tileWidth } = placement
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const invalidate = useThree((s) => s.invalidate)
  const spinner = useRef<THREE.Group>(null!)
  const motion = useRef({ angle: 0, grow: 1 })

  const center = useMemo(() => figureCenter(spec.bounds), [spec])
  const {
    scale: baseScale,
    width: restWidth,
    height: restHeight,
  } = useMemo(() => figureFit(spec.bounds, { size, tileWidth }), [spec, size, tileWidth])
  // Ao girar a figura cresce, mas sem passar da largura do cartão nem do topo da faixa.
  const activeScale = Math.max(
    1,
    Math.min(ACTIVE_SCALE, (tileWidth - 6) / restWidth, (cy - 2) / (restHeight / 2)),
  )

  useEffect(() => {
    invalidate()
  }, [active, invalidate])

  useFrame((state, delta) => {
    const m = motion.current
    let busy = false

    if (reducedMotion) {
      m.angle = 0
    } else if (active) {
      m.angle += SPIN_DEG_PER_SEC * delta
      busy = true
    } else if (m.angle !== 0) {
      // Termina a volta: desacelera até o próximo múltiplo de 360°.
      const diff = Math.ceil(m.angle / 360) * 360 - m.angle
      if (diff < 0.4) m.angle = 0
      else {
        m.angle += Math.max(diff * 0.14, 1)
        busy = true
      }
    }

    const targetGrow = active && !reducedMotion ? activeScale : 1
    if (Math.abs(targetGrow - m.grow) > 0.002) {
      m.grow += (targetGrow - m.grow) * (1 - Math.exp(-12 * Math.min(delta, 0.1)))
      busy = true
    } else {
      m.grow = targetGrow
    }

    const g = spinner.current
    g.rotation.set(REST_TILT_DEG * DEG, (spec.baseYawDeg + m.angle) * DEG, 0)
    g.scale.setScalar(baseScale * m.grow)
    if (busy) state.invalidate()
  })

  return (
    <group position={[cx - width / 2, height / 2 - cy, 0]} name={`figura-${area}`}>
      <group ref={spinner} rotation={[REST_TILT_DEG * DEG, spec.baseYawDeg * DEG, 0]} scale={baseScale}>
        <group position={[-center[0], -center[1], -center[2]]}>{spec.render()}</group>
      </group>
    </group>
  )
}

function Scene({ placements, reducedMotion }: AreaFiguresCanvasProps) {
  const stove = useMemo<StoveContextValue>(
    () => ({
      view: 'solid',
      clipPlanes: [],
      cutDepth: DEFAULT_CUT_DEPTH,
      explodeAmount: 0,
      config: FIGURE_CONFIG,
      parts: partStateFromConfig(FIGURE_CONFIG),
      openings: DEFAULT_OPENINGS,
      highlightPart: null,
      hoveredPart: null,
      reducedMotion,
      onHoverPart: noop,
    }),
    [reducedMotion],
  )

  return (
    <StoveProvider value={stove}>
      <Lights />
      <SettleDriver />
      {placements.map((p) => {
        const spec = AREA_FIGURES[p.area]
        return spec ? <Figure key={p.area} spec={spec} placement={p} reducedMotion={reducedMotion} /> : null
      })}
    </StoveProvider>
  )
}

export default function AreaFiguresCanvas(props: AreaFiguresCanvasProps) {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 0, 400], near: 1, far: 1000, zoom: 1 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05
      }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Scene {...props} />
    </Canvas>
  )
}
