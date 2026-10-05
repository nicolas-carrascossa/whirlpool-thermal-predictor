/**
 * Desenho de reserva de uma `key_area`, feito só com CSS 3D (sem WebGL).
 *
 * A figura que a faixa de áreas mostra é a peça real do fogão 3D, desenhada
 * com os mesmos componentes do mapa (`AreaFigures`). Este desenho só entra
 * quando o navegador não tem WebGL ou quando o canvas das figuras falha.
 *
 * Em repouso o objeto fica num ângulo fixo. Com `active` (mouse, foco ou
 * seleção) ele cresce um pouco e gira no próprio eixo; ao sair, termina a
 * volta atual e assenta na posição original em vez de "pular" de volta.
 *
 * As formas são ilustrativas — a peça real está no mapa térmico. O que importa
 * aqui é o reconhecimento rápido de qual parte do fogão a área representa.
 */

import { Fragment, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

import { usePrefersReducedMotion } from '@/components/thermal-map/usePrefersReducedMotion'

// Materiais reais, não a paleta da interface: a miniatura precisa lembrar a peça.
const STEEL = '#aeb4bb' // chapa de aço
const STEEL_D = '#737a82'
const ALU = '#d6dbdf' // alumínio / cromado
const BLACK = '#1d1f23'
const DARK = '#3d4249' // plástico/ferro escuro
const COPPER = '#c9803f'
const PCB = '#1f6a46'
const ELEMENT = '#d9532b' // resistência
const GLOW = '#ff9055'
const GLASS = '#13171c'
const SCREEN = '#0e2a35'
const AMBER = '#ffb547'
const BLUE = '#2a62b8'
const WHITE = '#f3f4f5'

/** Tamanho em que as formas foram desenhadas; o `size` da miniatura só escala. */
const DESIGN_SIZE = 44

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

/** Disco voltado para a frente (parafuso, botão, abertura redonda). */
function Disc({ r, color, x, y, z }: { r: number; color: string; x?: number; y?: number; z?: number }) {
  return (
    <At x={x} y={y} z={z}>
      <span style={{ ...face(2 * r, 2 * r, 'translateZ(0)', color), borderRadius: '50%' }} />
    </At>
  )
}

function Scene({ area }: { area: string }) {
  switch (area) {
    case 'Mainback': // painel traseiro em chapa, com a boca do blower, aberturas e parafusos
      return (
        <>
          <Box w={32} h={36} d={3} color={STEEL} />
          {[-13, -9.5, -6].map((y) => (
            <Box key={y} w={13} h={1.6} d={0.8} color={BLACK} x={-8} y={y} z={1.7} />
          ))}
          <Disc r={8.5} color={BLACK} x={4} y={6} z={1.7} />
          <Disc r={6} color={DARK} x={4} y={6} z={1.9} />
          <Disc r={2.2} color={ALU} x={4} y={6} z={2.1} />
          {[
            [-13.5, -15.5],
            [13.5, -15.5],
            [-13.5, 15.5],
            [13.5, 15.5],
          ].map(([x, y]) => (
            <Disc key={`${x}${y}`} r={1.3} color={STEEL_D} x={x} y={y} z={1.7} />
          ))}
          <Box w={9} h={4} d={0.8} color={ALU} x={-9} y={14} z={1.8} />
        </>
      )
    case 'Coil Temps': // resistência do forno: serpentina laranja sobre suporte
      return (
        <>
          <Box w={3} h={9} d={22} color={STEEL_D} x={-17} y={0} />
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} w={30} h={3} d={2.6} color={ELEMENT} x={-1} y={0} z={-9 + i * 6} />
          ))}
          {[0, 1, 2].map((i) => (
            <Box key={`b${i}`} w={2.6} h={3} d={6} color={ELEMENT} x={i % 2 === 0 ? 14 : -16} y={0} z={-6 + i * 6} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <Box key={`g${i}`} w={28} h={0.7} d={1.2} color={GLOW} x={-1} y={-1.8} z={-9 + i * 6} />
          ))}
          <Cylinder r={1.7} h={7} color={ALU} x={-19} y={-1} z={-9} sides={8} />
          <Cylinder r={1.7} h={7} color={ALU} x={-19} y={-1} z={9} sides={8} />
        </>
      )
    case 'Main Vent Sys': // blower: carcaça em caracol, boca de saída, grade e hub
      return (
        <>
          <Cylinder r={13} h={10} color={DARK} x={-3} y={1} />
          <Box w={11} h={10} d={15} color={DARK} x={12} y={1} />
          <Box w={2} h={12} d={17} color={STEEL} x={18} y={1} />
          <Cylinder r={13.4} h={1.4} color={STEEL} x={-3} y={-4.6} />
          <Ring r={9} color={BLACK} thick={3} x={-3} y={-5.5} />
          {[0, 45, 90, 135].map((a) => (
            <At key={a} x={-3} y={-5.2}>
              <span style={{ ...layer, transform: `rotateY(${a}deg)` }}>
                <Box w={16} h={0.8} d={1.6} color={ALU} />
              </span>
            </At>
          ))}
          <Cylinder r={3} h={2.4} color={STEEL_D} x={-3} y={-6} sides={10} />
        </>
      )
    case 'IPC Cooling': // dissipador de alumínio com heat pipes de cobre
      return (
        <>
          <Box w={34} h={3} d={24} color={STEEL_D} y={11} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Box key={i} w={2} h={18} d={24} color={ALU} x={-14 + i * 4} y={0.5} />
          ))}
          {[-7, 7].map((x) => (
            <Box key={x} w={3} h={3} d={27} color={COPPER} x={x} y={6} />
          ))}
        </>
      )
    case 'IPC Comp': // placa de potência: IGBTs, capacitores e bornes
      return (
        <>
          <Box w={36} h={2.4} d={28} color={PCB} y={10} />
          {[-11, -3, 5].map((x) => (
            <Box key={x} w={6} h={10} d={3.2} color={BLACK} x={x} y={4.2} z={-5} />
          ))}
          {[-11, -3, 5].map((x) => (
            <Box key={`t${x}`} w={4.4} h={3} d={0.9} color={ALU} x={x} y={-2} z={-5} />
          ))}
          <Cylinder r={3.6} h={11} color="#23272e" x={-12} y={4.3} z={7} />
          <Cylinder r={3.6} h={11} color="#23272e" x={-4} y={4.3} z={7} />
          <Box w={10} h={6} d={5} color={BLUE} x={12} y={6.7} z={8} />
          <Box w={4.5} h={1.8} d={4.5} color={BLACK} x={12} y={8.5} z={-6} />
        </>
      )
    case 'Oven HMI': // painel do forno: vidro escuro, display, botões e knob
      return (
        <>
          <Box w={38} h={15} d={3.5} color={GLASS} />
          <Box w={40} h={1.2} d={4.2} color={STEEL} y={-8} />
          <Box w={40} h={1.2} d={4.2} color={STEEL} y={8} />
          <Box w={15} h={7} d={0.7} color={SCREEN} x={-8} y={-1} z={2.1} />
          {[-12, -8, -4].map((x) => (
            <Box key={x} w={2.4} h={3.6} d={0.4} color={AMBER} x={x} y={-1} z={2.5} />
          ))}
          {[-12, -7, -2].map((x) => (
            <Disc key={x} r={1.3} color={ALU} x={x} y={4.2} z={1.9} />
          ))}
          <Disc r={4.4} color="#2b2e33" x={11} y={0.5} z={1.9} />
          <Disc r={3.2} color={ALU} x={11} y={0.5} z={2.1} />
          <Box w={0.9} h={3} d={0.4} color={WHITE} x={11} y={-0.8} z={2.4} />
        </>
      )
    case 'CT Knobs': // botões do cooktop: três knobs pretos com anel cromado
      return (
        <>
          <Box w={40} h={7} d={6} color={STEEL} y={11} />
          {[-13, 0, 13].map((x) => (
            <Fragment key={x}>
              <Cylinder r={5.4} h={10} color={BLACK} x={x} y={2.5} />
              <Cylinder r={6.6} h={1.3} color={ALU} x={x} y={7} />
              <Cylinder r={3.8} h={0.9} color={ALU} x={x} y={-3} />
              <Box w={1.4} h={0.9} d={5} color={WHITE} x={x} y={-3.8} z={-1.2} />
            </Fragment>
          ))}
        </>
      )
    default:
      return <Box w={22} h={22} d={22} color={DARK} />
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
      className="relative inline-block shrink-0 transition-transform duration-200 ease-out"
      style={{
        width: size,
        height: size,
        perspective: size * 4,
        transform: active ? 'scale(1.22)' : 'scale(1)',
      }}
    >
      {/* Sombra de chão: dá peso ao objeto e acompanha o aumento do hover (a sombra de
          `filter` não pode ficar no elemento 3D, porque achataria as faces). */}
      <span
        className="absolute bottom-[20%] left-1/2 -z-10 h-[6px] -translate-x-1/2 rounded-full bg-black/25 blur-[3px]"
        style={{ width: size * 0.62 }}
      />
      <span
        ref={spinRef}
        className="relative block h-full w-full"
        style={{ transformStyle: 'preserve-3d', transform: `rotateX(${REST_TILT_X}deg) rotateY(${REST_YAW}deg)` }}
      >
        {/* Escala: as formas são desenhadas em 44 px; `size` só aumenta/diminui o conjunto. */}
        <span
          className="block h-full w-full"
          style={{ transformStyle: 'preserve-3d', transform: `scale(${size / DESIGN_SIZE})` }}
        >
          <Scene area={area} />
        </span>
      </span>
    </span>
  )
}
