/**
 * Miniatura 3D de uma `key_area`, feita só com CSS 3D (sem canvas WebGL): sete
 * miniaturas num painel lateral não justificam sete contextos `three.js`.
 *
 * Em repouso o objeto fica num ângulo fixo. Com `active` (mouse ou foco na
 * linha da área) ele cresce um pouco e gira no próprio eixo; ao sair, termina
 * a volta atual e assenta na posição original em vez de "pular" de volta.
 *
 * As formas são ilustrativas — a peça real está no mapa térmico. O que importa
 * aqui é o reconhecimento rápido de qual parte do fogão a área representa.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import { usePrefersReducedMotion } from '@/components/thermal-map/usePrefersReducedMotion'

const CORE = 'var(--wp-core)'
const ACCENT = 'var(--wp-accent)'
const GRAY = 'var(--wp-gray-45)'
const LIGHT = 'var(--wp-gray-20)'
const WARM = 'var(--status-warn)'

/** Ângulo de repouso: mostra a frente e uma lateral, para a forma ler como 3D. */
const REST_TILT_X = -24
const REST_YAW = 32
const SPIN_DEG_PER_SEC = 140

function shade(color: string, blackPct: number): string {
  return blackPct === 0 ? color : `color-mix(in srgb, ${color}, black ${blackPct}%)`
}

const layer: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transformStyle: 'preserve-3d',
}

/** Posiciona um filho no espaço da cena (px, `y` cresce para baixo). */
function At({ x = 0, y = 0, z = 0, children }: { x?: number; y?: number; z?: number; children: ReactNode }) {
  return <span style={{ ...layer, width: 0, height: 0, transform: `translate3d(${x}px, ${y}px, ${z}px)` }}>{children}</span>
}

function face(w: number, h: number, transform: string, background: string): CSSProperties {
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: w,
    height: h,
    marginLeft: -w / 2,
    marginTop: -h / 2,
    background,
    transform,
    backfaceVisibility: 'hidden',
  }
}

function Box({ w, h, d, color, x, y, z }: { w: number; h: number; d: number; color: string; x?: number; y?: number; z?: number }) {
  return (
    <At x={x} y={y} z={z}>
      <span style={face(w, h, `translateZ(${d / 2}px)`, color)} />
      <span style={face(w, h, `rotateY(180deg) translateZ(${d / 2}px)`, shade(color, 35))} />
      <span style={face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, shade(color, 18))} />
      <span style={face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, shade(color, 28))} />
      <span style={face(w, d, `rotateX(90deg) translateZ(${h / 2}px)`, color)} />
      <span style={face(w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, shade(color, 45))} />
    </At>
  )
}

/** Cilindro aproximado por um prisma de `sides` lados + tampa circular. */
function Cylinder({ r, h, color, x, y, z, sides = 12 }: { r: number; h: number; color: string; x?: number; y?: number; z?: number; sides?: number }) {
  const apothem = r * Math.cos(Math.PI / sides)
  const sideW = 2 * r * Math.tan(Math.PI / sides) + 0.6
  return (
    <At x={x} y={y} z={z}>
      {Array.from({ length: sides }, (_, i) => (
        <span
          key={i}
          style={face(sideW, h, `rotateY(${(360 / sides) * i}deg) translateZ(${apothem}px)`, shade(color, 12 + (i % 4) * 9))}
        />
      ))}
      <span style={{ ...face(2 * r, 2 * r, `rotateX(90deg) translateZ(${h / 2}px)`, color), borderRadius: '50%' }} />
    </At>
  )
}

function Ring({ r, color, thick = 2.5, x, y, z }: { r: number; color: string; thick?: number; x?: number; y?: number; z?: number }) {
  return (
    <At x={x} y={y} z={z}>
      <span
        style={{
          ...face(2 * r, 2 * r, 'rotateX(90deg)', 'transparent'),
          boxSizing: 'border-box',
          border: `${thick}px solid ${color}`,
          borderRadius: '50%',
          backfaceVisibility: 'visible',
        }}
      />
    </At>
  )
}

function Scene({ area }: { area: string }) {
  switch (area) {
    case 'Mainback': // painel traseiro, com a abertura do blower
      return (
        <>
          <Box w={30} h={34} d={4} color={CORE} />
          <Box w={12} h={12} d={2} color={LIGHT} y={-5} z={3} />
          <Box w={18} h={3} d={2} color={ACCENT} y={11} z={3} />
        </>
      )
    case 'Coil Temps': // resistências: anéis concêntricos
      return (
        <>
          <Cylinder r={15} h={2} color={LIGHT} y={8} />
          <Ring r={13} color={WARM} y={4} />
          <Ring r={8.5} color={WARM} y={4} />
          <Ring r={4} color={WARM} y={4} />
        </>
      )
    case 'Main Vent Sys': // ventilação: carcaça do blower + pás
      return (
        <>
          <Cylinder r={15} h={8} color={GRAY} />
          <At y={-4.5}>
            <span style={{ ...layer, transform: 'rotateX(90deg)' }}>
              <span style={face(28, 5, 'translateZ(0)', ACCENT)} />
              <span style={face(28, 5, 'rotateZ(60deg)', ACCENT)} />
              <span style={face(28, 5, 'rotateZ(120deg)', ACCENT)} />
            </span>
          </At>
        </>
      )
    case 'IPC Cooling': // dissipador: base + aletas
      return (
        <>
          <Box w={32} h={4} d={22} color={GRAY} y={10} />
          {[-12, -6, 0, 6, 12].map((x) => (
            <Box key={x} w={2.4} h={17} d={22} color={ACCENT} x={x} y={-1} />
          ))}
        </>
      )
    case 'IPC Comp': // placa da eletrônica de potência com componentes
      return (
        <>
          <Box w={34} h={3} d={26} color={CORE} y={8} />
          <Box w={9} h={8} d={9} color="#2b2b2b" x={-9} y={2} z={-4} />
          <Box w={9} h={8} d={9} color="#2b2b2b" x={4} y={2} z={-4} />
          <Box w={6} h={5} d={6} color={WARM} x={-2} y={3.5} z={7} />
          <Box w={5} h={10} d={5} color={LIGHT} x={12} y={0} z={6} />
        </>
      )
    case 'Oven HMI': // interface do forno: painel com tela e botões
      return (
        <>
          <Box w={36} h={14} d={4} color={CORE} />
          <Box w={14} h={7} d={1.5} color={ACCENT} x={-7} z={2.6} />
          <Cylinder r={2.6} h={2} color={LIGHT} x={9} y={0} z={3} sides={8} />
        </>
      )
    case 'CT Knobs': // botões do cooktop
      return (
        <>
          <Box w={36} h={10} d={5} color={GRAY} y={10} />
          <Cylinder r={6} h={9} color={CORE} x={-9} y={0} />
          <Cylinder r={6} h={9} color={CORE} x={9} y={0} />
          <Box w={2} h={2} d={6} color={LIGHT} x={-9} y={-5} z={-1} />
          <Box w={2} h={2} d={6} color={LIGHT} x={9} y={-5} z={-1} />
        </>
      )
    default:
      return <Box w={22} h={22} d={22} color={CORE} />
  }
}

export function AreaThumb({ area, active = false, size = 44 }: { area: string; active?: boolean; size?: number }) {
  const reduced = usePrefersReducedMotion()
  const spinRef = useRef<HTMLSpanElement>(null)
  const angleRef = useRef(0)
  const frameRef = useRef(0)

  const apply = (angle: number) => {
    const el = spinRef.current
    if (el) el.style.transform = `rotateX(${REST_TILT_X}deg) rotateY(${REST_YAW + angle}deg)`
  }

  useEffect(() => {
    if (reduced) {
      angleRef.current = 0
      apply(0)
      return
    }
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000
      last = now
      if (active) {
        angleRef.current += SPIN_DEG_PER_SEC * dt
      } else {
        // Termina a volta: desacelera até o próximo múltiplo de 360°.
        const target = Math.ceil(angleRef.current / 360) * 360
        const diff = target - angleRef.current
        if (diff < 0.4) {
          angleRef.current = 0
          apply(0)
          return
        }
        angleRef.current += Math.max(diff * 0.14, 1)
      }
      apply(angleRef.current)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
    // `apply` só lê refs; não precisa ser dependência.
  }, [active, reduced])

  return (
    <span
      aria-hidden="true"
      data-area-thumb={area}
      className="inline-block shrink-0 transition-transform duration-200 ease-out"
      style={{
        width: size,
        height: size,
        perspective: size * 4,
        transform: active ? 'scale(1.22)' : 'scale(1)',
      }}
    >
      <span
        ref={spinRef}
        className="relative block h-full w-full"
        style={{ transformStyle: 'preserve-3d', transform: `rotateX(${REST_TILT_X}deg) rotateY(${REST_YAW}deg)` }}
      >
        <Scene area={area} />
      </span>
    </span>
  )
}
