/**
 * Corpo do fogão: painéis do gabinete, cavidade do forno, porta com vidro,
 * cooktop com grades, console e pés. Nenhuma dessas peças é interativa — as
 * zonas coloridas (`ZoneMesh`) e as peças configuráveis (`parts/`) ficam por
 * cima. Geometria ilustrativa, não é CAD.
 */
import { C, ShellMaterial } from './materials'
import { Openable } from './Openable'
import { useStove } from './StoveContext'
import { cutZForDepth } from './cutPlane'
import {
  BACKSPLASH,
  BODY,
  BODY_BACK,
  BODY_FRONT,
  BURNER_SLOTS,
  CAVITY,
  CONSOLE,
} from './zoneGeometry'

const T = 0.6 // espessura padrão dos painéis

function Panel({
  args,
  position,
  color = C.bodyLight,
  roughness = 0.6,
  metalness = 0.1,
  clip = true,
}: {
  args: [number, number, number]
  position: [number, number, number]
  color?: string
  roughness?: number
  metalness?: number
  clip?: boolean
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <ShellMaterial color={color} roughness={roughness} metalness={metalness} clip={clip} />
    </mesh>
  )
}

function Cabinet() {
  const halfW = BODY.w / 2
  return (
    <group>
      {/* laterais e fundo (a traseira sai em "Abrir traseira") */}
      <Panel args={[T, BODY.h, BODY.d]} position={[-halfW + T / 2, 0, 0]} />
      <Panel args={[T, BODY.h, BODY.d]} position={[halfW - T / 2, 0, 0]} />
      <Panel args={[BODY.w, 0.9, BODY.d]} position={[0, -BODY.h / 2 + 0.45, 0]} />
      {/* moldura frontal em volta da abertura da porta */}
      <Panel args={[1.6, BODY.h, T]} position={[-halfW + 0.8, 0, BODY_FRONT - T / 2]} color={C.bodyMid} />
      <Panel args={[1.6, BODY.h, T]} position={[halfW - 0.8, 0, BODY_FRONT - T / 2]} color={C.bodyMid} />
      <Panel args={[BODY.w, 6, T]} position={[0, BODY.h / 2 - 3, BODY_FRONT - T / 2]} color={C.bodyMid} />
      <Panel args={[BODY.w, 2.4, T]} position={[0, -BODY.h / 2 + 1.2, BODY_FRONT - T / 2]} color={C.bodyMid} />
    </group>
  )
}

/** Cavidade esmaltada: caixa aberta para a frente. A parede do fundo recebe o brilho. */
function Cavity() {
  const enamel = '#3c3f42'
  const { w, h, d, yCenter, zCenter } = CAVITY
  return (
    <group>
      <Panel args={[w, 0.5, d]} position={[0, yCenter + h / 2, zCenter]} color={enamel} roughness={0.45} />
      <Panel args={[w, 0.5, d]} position={[0, yCenter - h / 2, zCenter]} color={enamel} roughness={0.45} />
      <Panel args={[0.5, h, d]} position={[-w / 2, yCenter, zCenter]} color={enamel} roughness={0.45} />
      <Panel args={[0.5, h, d]} position={[w / 2, yCenter, zCenter]} color={enamel} roughness={0.45} />
    </group>
  )
}

/** Painel traseiro do corpo + fundo do console: saem juntos em "Abrir traseira". */
function RearPanels() {
  return (
    <group>
      <Panel args={[BODY.w, BODY.h, T]} position={[0, 0, BODY_BACK + T / 2]} color={C.bodyMid} />
      <Panel
        args={[BACKSPLASH.w, BACKSPLASH.h, 0.5]}
        position={[0, CONSOLE.yCenter, CONSOLE.zBack + 0.25]}
        color={C.bodyMid}
      />
    </group>
  )
}

function Door() {
  return (
    <group>
      <Panel args={[BODY.w - 1.2, 16.6, 0.8]} position={[0, -2.4, BODY_FRONT + 0.4]} color={C.bodyMid} />
      {/* vidro escuro: deixa ver a resistência acesa por dentro */}
      <mesh position={[0, -2.2, BODY_FRONT + 0.9]}>
        <boxGeometry args={[19, 10.6, 0.25]} />
        <ShellMaterial color={C.glass} roughness={0.12} metalness={0.35} opacity={0.62} />
      </mesh>
      {/* puxador */}
      <mesh position={[0, 6.6, BODY_FRONT + 1.75]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 21, 16]} />
        <ShellMaterial color={C.metal} roughness={0.3} metalness={0.75} />
      </mesh>
      {[-10.2, 10.2].map((x) => (
        <Panel key={x} args={[0.7, 0.7, 1.5]} position={[x, 6.6, BODY_FRONT + 1.1]} color={C.metalDark} />
      ))}
    </group>
  )
}

function Cooktop() {
  return (
    <group>
      {/* mesa: nunca é cortada, para que a carga do cooktop siga visível no modo Corte */}
      <Panel args={[BODY.w, 0.9, BODY.d]} position={[0, BODY.h / 2 - 0.45, 0]} clip={false} />
      {BURNER_SLOTS.map(([x, z], i) => (
        <group key={i} position={[x, BODY.h / 2 + 0.02, z]}>
          {/* anel rebaixado do queimador */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.5, 0.14, 8, 28]} />
            <ShellMaterial color={C.divider} roughness={0.5} metalness={0.2} clip={false} />
          </mesh>
          {/* grade: três barras */}
          {[-1.6, 0, 1.6].map((dx) => (
            <Panel
              key={dx}
              args={[0.32, 0.32, 6.2]}
              position={[dx, 0.42, 0]}
              color={C.dark}
              roughness={0.8}
              metalness={0.05}
              clip={false}
            />
          ))}
          <Panel
            args={[6.2, 0.3, 0.32]}
            position={[0, 0.42, 0]}
            color={C.dark}
            roughness={0.8}
            metalness={0.05}
            clip={false}
          />
        </group>
      ))}
    </group>
  )
}

/**
 * Tampa do console: laterais, tampo (partido pela fenda de ventilação), face
 * frontal e faixa de comando. Sobe inteira em "Abrir console", junto com as
 * zonas da fachada (botões e display), que são filhas do mesmo `<Openable>`.
 */
function ConsoleCover() {
  const halfW = BACKSPLASH.w / 2
  const { yCenter, yTop, zFront } = CONSOLE
  return (
    <group>
      <Panel args={[0.5, BACKSPLASH.h, BACKSPLASH.d]} position={[-halfW + 0.25, yCenter, CONSOLE.zCenter]} />
      <Panel args={[0.5, BACKSPLASH.h, BACKSPLASH.d]} position={[halfW - 0.25, yCenter, CONSOLE.zCenter]} />
      {/* tampo, partido para abrir a fenda de ventilação */}
      <Panel args={[BACKSPLASH.w, 0.5, 1.6]} position={[0, yTop - 0.25, -4.3]} />
      <Panel args={[BACKSPLASH.w, 0.5, 2.2]} position={[0, yTop - 0.25, -7.9]} />
      {/* face frontal do console + faixa de comando escura */}
      <Panel args={[BACKSPLASH.w, BACKSPLASH.h, 0.4]} position={[0, yCenter, zFront - 0.2]} />
      <Panel
        args={[BACKSPLASH.w - 1.6, 6.2, 0.22]}
        position={[0, 16.6, zFront + 0.1]}
        color={C.dark}
        roughness={0.75}
        metalness={0.05}
      />
    </group>
  )
}

function Feet() {
  return (
    <group>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 11.6, -BODY.h / 2 - 0.9, sz * 7.2]}>
            <cylinderGeometry args={[0.75, 0.62, 1.8, 14]} />
            <ShellMaterial color={C.dark} roughness={0.85} metalness={0} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** Y do chão (base dos pés) — usado pela sombra de contato. */
export const FLOOR_Y = -BODY.h / 2 - 1.8

/**
 * Tampa escura da face cortada (modo Corte). São faixas com a seção das
 * paredes — laterais, base, mesa e paredes do console — e **não** um plano
 * cheio: um plano cobrindo toda a seção transversal esconderia justamente o
 * interior que o corte existe para mostrar. Assim a face cortada parece
 * maciça sem tapar a cavidade nem o console.
 */
function CutCap() {
  const { view, cutDepth } = useStove()
  if (view !== 'cutaway') return null
  const z = cutZForDepth(cutDepth) - 0.02
  // fora do corpo o corte não encontra material: nada a tampar
  if (z > BODY_FRONT || z < BODY_BACK) return null

  const halfW = BODY.w / 2
  const cap = (args: [number, number], position: [number, number]) => (
    <mesh key={`${position[0]}-${position[1]}-${args[0]}`} position={[position[0], position[1], z]}>
      <planeGeometry args={args} />
      <meshStandardMaterial color={C.dark} roughness={0.9} metalness={0} side={2} />
    </mesh>
  )

  const consoleVisible = z <= CONSOLE.zFront && z >= CONSOLE.zBack
  const halfCW = BACKSPLASH.w / 2

  return (
    <group>
      {cap([T, BODY.h], [-halfW + T / 2, 0])}
      {cap([T, BODY.h], [halfW - T / 2, 0])}
      {cap([BODY.w, 0.9], [0, -BODY.h / 2 + 0.45])}
      {cap([BODY.w, 0.9], [0, BODY.h / 2 - 0.45])}
      {consoleVisible && (
        <>
          {cap([0.5, BACKSPLASH.h], [-halfCW + 0.25, CONSOLE.yCenter])}
          {cap([0.5, BACKSPLASH.h], [halfCW - 0.25, CONSOLE.yCenter])}
          {cap([BACKSPLASH.w, 0.5], [0, CONSOLE.yTop - 0.25])}
        </>
      )}
    </group>
  )
}

/**
 * `consoleExtras` entra **dentro** do `<Openable kind="console">`: é por onde
 * as zonas da fachada (botões, display) e seus rótulos sobem junto com a
 * tampa, sem depender de dois grupos animados manterem-se sincronizados.
 */
export function StoveBody({ consoleExtras }: { consoleExtras?: React.ReactNode }) {
  return (
    <group>
      <Cabinet />
      <Cavity />
      <Cooktop />
      <Openable kind="console">
        <ConsoleCover />
        {consoleExtras}
      </Openable>
      <Feet />
      <Openable kind="rear">
        <RearPanels />
      </Openable>
      <Openable kind="oven">
        <Door />
      </Openable>
      <CutCap />
    </group>
  )
}
