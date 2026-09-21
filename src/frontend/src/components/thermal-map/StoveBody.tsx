/**
 * Corpo do fogão: painéis do gabinete em inox escovado, cavidade esmaltada com
 * grades de arame, porta com vidro, cooktop de vitrocerâmica, console com
 * botões e display, e pés. Segue o produto real (range elétrica de piso de
 * 30", controle frontal) sem virar CAD: nenhuma dessas peças é interativa — as
 * zonas coloridas (`ZoneMesh`) e as peças configuráveis (`parts/`) ficam por
 * cima e são as superfícies de dado. Geometria ilustrativa.
 */
import { ExplodeLayer } from './ExplodeLayer'
import { C, ShellMaterial } from './materials'
import { Openable } from './Openable'
import { CooktopGlow, CooktopLoad } from './parts/CooktopLoad'
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
  COOKTOP_AUX_ELEMENT,
  COOKTOP_ELEMENTS,
  COOKTOP_GLASS,
  COOKTOP_STACK,
  DRAWER,
  VENT_TRIM,
  ZONE_MESHES,
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

/** Inox escovado dos painéis externos: roughness média-baixa, metalness alta. */
const STEEL = { roughness: 0.38, metalness: 0.78 }

function Cabinet() {
  const halfW = BODY.w / 2
  return (
    <group>
      {/* laterais e fundo (a traseira sai em "Abrir traseira") */}
      <Panel args={[T, BODY.h, BODY.d]} position={[-halfW + T / 2, 0, 0]} color={C.steel} {...STEEL} />
      <Panel args={[T, BODY.h, BODY.d]} position={[halfW - T / 2, 0, 0]} color={C.steel} {...STEEL} />
      <Panel args={[BODY.w, 0.9, BODY.d]} position={[0, -BODY.h / 2 + 0.45, 0]} color={C.dark} roughness={0.8} />
      {/* moldura frontal em volta da abertura da porta */}
      <Panel args={[1.6, BODY.h, T]} position={[-halfW + 0.8, 0, BODY_FRONT - T / 2]} color={C.steelDark} {...STEEL} />
      <Panel args={[1.6, BODY.h, T]} position={[halfW - 0.8, 0, BODY_FRONT - T / 2]} color={C.steelDark} {...STEEL} />
      <Panel args={[BODY.w, 6, T]} position={[0, BODY.h / 2 - 3, BODY_FRONT - T / 2]} color={C.steelDark} {...STEEL} />
      <Panel args={[BODY.w, 2.4, T]} position={[0, -BODY.h / 2 + 1.2, BODY_FRONT - T / 2]} color={C.steelDark} {...STEEL} />
    </group>
  )
}

/**
 * Níveis das grades do forno (Y). Ficam acima e abaixo da resistência
 * (`Coil Temps`, y ≈ -1), que é zona de dado e não pode ser atravessada.
 */
const RACK_LEVELS = [2.2, -4.6]
/** X dos fios longitudinais de cada grade: par, para deixar o centro livre. */
const RACK_WIRE_XS = [-8.4, -5.0, -1.7, 1.7, 5.0, 8.4]
const RACK_W = CAVITY.w - 1.8
const RACK_D = CAVITY.d - 2.4
const WIRE = 0.22

/**
 * Grade de arame em um nível: barra da frente, barra de trás e seis fios
 * longitudinais — oito caixas finas, não fio a fio. Todas cortáveis no modo
 * Corte, como o resto do interior.
 */
function WireRack({ y }: { y: number }) {
  const zFront = CAVITY.zCenter + RACK_D / 2
  const zBack = CAVITY.zCenter - RACK_D / 2
  return (
    <group>
      <Panel args={[RACK_W, WIRE, WIRE]} position={[0, y, zFront]} color={C.wire} roughness={0.3} metalness={0.8} />
      <Panel args={[RACK_W, WIRE, WIRE]} position={[0, y, zBack]} color={C.wire} roughness={0.3} metalness={0.8} />
      {RACK_WIRE_XS.map((x) => (
        <Panel
          key={x}
          args={[WIRE, WIRE, RACK_D]}
          position={[x, y, CAVITY.zCenter]}
          color={C.wire}
          roughness={0.3}
          metalness={0.8}
        />
      ))}
    </group>
  )
}

/**
 * Cavidade esmaltada: caixa aberta para a frente, com trilhos laterais e duas
 * grades de arame em níveis diferentes, visíveis pelo vidro da porta. A parede
 * do fundo recebe o brilho.
 */
function Cavity() {
  const { w, h, d, yCenter, zCenter } = CAVITY
  const enamel = { color: C.enamel, roughness: 0.45 }
  return (
    <group>
      <Panel args={[w, 0.5, d]} position={[0, yCenter + h / 2, zCenter]} {...enamel} />
      <Panel args={[w, 0.5, d]} position={[0, yCenter - h / 2, zCenter]} {...enamel} />
      <Panel args={[0.5, h, d]} position={[-w / 2, yCenter, zCenter]} {...enamel} />
      <Panel args={[0.5, h, d]} position={[w / 2, yCenter, zCenter]} {...enamel} />
      {/* trilhos laterais: um par por nível, presos às paredes */}
      {RACK_LEVELS.map((y) =>
        [-1, 1].map((sx) => (
          <Panel
            key={`${y}-${sx}`}
            args={[0.5, 0.3, RACK_D]}
            position={[sx * (w / 2 - 0.5), y - 0.25, zCenter]}
            color={C.gray45}
            roughness={0.4}
            metalness={0.6}
          />
        )),
      )}
      {RACK_LEVELS.map((y) => (
        <WireRack key={y} y={y} />
      ))}
    </group>
  )
}

/** Painel traseiro do corpo + fundo do console: saem juntos em "Abrir traseira". */
function RearPanels() {
  return (
    <group>
      <Panel args={[BODY.w, BODY.h, T]} position={[0, 0, BODY_BACK + T / 2]} color={C.steel} {...STEEL} />
      <Panel
        args={[BACKSPLASH.w, BACKSPLASH.h, 0.5]}
        position={[0, CONSOLE.yCenter, CONSOLE.zBack + 0.25]}
        color={C.steel}
        {...STEEL}
      />
    </group>
  )
}

/** Porta do forno: da dobradiça (`DOOR_HINGE_Y`, topo da gaveta) até a faixa frontal. */
const DOOR_BOTTOM = DRAWER.yTop
const DOOR_TOP = 5.9
const DOOR_CENTER_Y = (DOOR_BOTTOM + DOOR_TOP) / 2

function Door() {
  const h = DOOR_TOP - DOOR_BOTTOM
  return (
    <group>
      <Panel args={[BODY.w - 1.2, h, 0.8]} position={[0, DOOR_CENTER_Y, BODY_FRONT + 0.4]} color={C.steel} {...STEEL} />
      {/* janela de vidro grande, ocupando a maior parte da face: deixa ver a
          resistência e as grades por dentro */}
      <mesh position={[0, DOOR_CENTER_Y - 0.6, BODY_FRONT + 0.9]}>
        <boxGeometry args={[21.2, h - 3.6, 0.25]} />
        <ShellMaterial color={C.glass} roughness={0.12} metalness={0.35} opacity={0.62} />
      </mesh>
      {/* puxador tubular de largura total sobre dois stand-offs */}
      <mesh position={[0, DOOR_TOP - 0.9, BODY_FRONT + 1.75]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 21, 16]} />
        <ShellMaterial color={C.steel} roughness={0.25} metalness={0.85} />
      </mesh>
      {[-10.2, 10.2].map((x) => (
        <Panel key={x} args={[0.7, 0.7, 1.5]} position={[x, DOOR_TOP - 0.9, BODY_FRONT + 1.1]} color={C.steelDark} {...STEEL} />
      ))}
    </group>
  )
}

/**
 * Gaveta de armazenamento sob o forno: frente estática com puxador próprio,
 * coerente com a porta. Não abre — fica no corpo, fora de qualquer `<Openable>`.
 */
function Drawer() {
  const h = DRAWER.yTop - DRAWER.yBottom
  const y = (DRAWER.yTop + DRAWER.yBottom) / 2
  return (
    <group>
      <Panel args={[BODY.w - 1.2, h - 0.3, 0.8]} position={[0, y, BODY_FRONT + 0.4]} color={C.steel} {...STEEL} />
      <mesh position={[0, DRAWER.handleY, BODY_FRONT + 1.35]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 14, 14]} />
        <ShellMaterial color={C.steel} roughness={0.25} metalness={0.85} />
      </mesh>
      {[-6.6, 6.6].map((x) => (
        <Panel key={x} args={[0.6, 0.6, 1.0]} position={[x, DRAWER.handleY, BODY_FRONT + 1.0]} color={C.steelDark} {...STEEL} />
      ))}
    </group>
  )
}

/** Anel serigrafado sobre o vidro: plano, quase rente — marcação impressa, não peça. */
function PrintedRing({
  x,
  z,
  radius,
  width = 0.16,
}: {
  x: number
  z: number
  radius: number
  width?: number
}) {
  return (
    <mesh position={[x, COOKTOP_GLASS.yTop + 0.006, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - width, radius, 40]} />
      <ShellMaterial color={C.ceranPrint} roughness={0.6} metalness={0.1} clip={false} />
    </mesh>
  )
}

/** Toda a pilha do cooktop fica fora do corte, para a carga seguir visível no modo Corte. */
const TOP_STACK = { ...STEEL, clip: false }

/**
 * Camada de cima da pilha: vidro de vitrocerâmica quase preto, levemente
 * reflexivo, recuado dentro de um trim metálico; sem grades nem anéis
 * salientes — o produto é elétrico. Os elementos aparecem como anéis
 * serigrafados de diâmetros diferentes (um de anel duplo, a zona expansível),
 * mais um auxiliar pequeno entre os traseiros.
 */
function CooktopGlass() {
  const { inset, yBottom, yTop, thickness, trim, zRear } = COOKTOP_GLASS
  const glassW = BODY.w - inset * 2
  const zFront = BODY.d / 2 - inset
  const glassD = zFront - zRear
  const trimY = yBottom + trim.h / 2
  return (
    <group>
      {/* vidro: levemente translúcido para a resistência brilhar por baixo */}
      <mesh position={[0, (yBottom + yTop) / 2, (zRear + zFront) / 2]}>
        <boxGeometry args={[glassW, thickness, glassD]} />
        <ShellMaterial color={C.ceran} roughness={0.18} metalness={0.45} opacity={0.9} clip={false} />
      </mesh>
      {/* trim metálico: laterais da traseira à frente, barra da frente; atrás, o Top Vent Trim */}
      {[-1, 1].map((s) => (
        <Panel
          key={`x${s}`}
          args={[trim.w, trim.h, BODY.d]}
          position={[s * (BODY.w / 2 - trim.w / 2), trimY, 0]}
          color={C.steelDark}
          {...TOP_STACK}
        />
      ))}
      <Panel
        args={[BODY.w, trim.h, trim.w]}
        position={[0, trimY, BODY.d / 2 - trim.w / 2]}
        color={C.steelDark}
        {...TOP_STACK}
      />
      {/* elementos radiantes: serigrafia rasa, layout assimétrico */}
      {BURNER_SLOTS.map(([x, z], i) => {
        const element = COOKTOP_ELEMENTS[i]
        return (
          <group key={i}>
            <PrintedRing x={x} z={z} radius={element.radius} />
            {element.innerRadius !== undefined && (
              <PrintedRing x={x} z={z} radius={element.innerRadius} width={0.12} />
            )}
          </group>
        )
      })}
      <PrintedRing
        x={COOKTOP_AUX_ELEMENT.x}
        z={COOKTOP_AUX_ELEMENT.z}
        radius={COOKTOP_AUX_ELEMENT.radius}
        width={0.12}
      />
    </group>
  )
}

/**
 * Camada dos elementos radiantes: uma espiral (dois anéis finos concêntricos)
 * escura por elemento, sobre um refletor. É o que se vê sob o vidro na vista
 * explodida — e onde a resistência acesa brilha (`CooktopGlow`).
 */
function RadiantElements() {
  const { elementsY, reflectorY } = COOKTOP_STACK
  return (
    <group>
      {BURNER_SLOTS.map(([x, z], i) => {
        const r = COOKTOP_ELEMENTS[i].radius
        return (
          <group key={i} position={[x, 0, z]}>
            {[r - 0.35, r - 0.95].map((ring) => (
              <mesh key={ring} position={[0, elementsY, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[ring, 0.12, 6, 32]} />
                <ShellMaterial color={C.dark} roughness={0.7} metalness={0.2} clip={false} />
              </mesh>
            ))}
            <mesh position={[0, reflectorY, 0]}>
              <cylinderGeometry args={[r + 0.3, r + 0.3, 0.15, 32]} />
              <ShellMaterial color={C.metal} roughness={0.35} metalness={0.7} clip={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/**
 * Camada da bandeja: chapa que fecha o corpo por cima e sustenta os elementos,
 * com um suporte curto sob cada um. Abaixo dela começa a baía da eletrônica.
 */
function CooktopTray() {
  const { trayY, trayThickness, reflectorY } = COOKTOP_STACK
  return (
    <group>
      <Panel args={[BODY.w, trayThickness, BODY.d]} position={[0, trayY, 0]} color={C.steelDark} {...TOP_STACK} />
      {BURNER_SLOTS.map(([x, z], i) => (
        <Panel
          key={i}
          args={[0.7, reflectorY - trayY, 0.7]}
          position={[x, (reflectorY + trayY) / 2, z]}
          color={C.gray45}
          roughness={0.5}
          metalness={0.4}
          clip={false}
        />
      ))}
    </group>
  )
}

/** Zonas da fachada que ganham peças decorativas em volta (botões e display). */
const KNOB_ZONES = ZONE_MESHES.filter((z) => z.zoneKey === 'CT Knobs')
const HMI_ZONE = ZONE_MESHES.find((z) => z.zoneKey === 'Oven HMI')
const VENT_ZONE = ZONE_MESHES.find((z) => z.zoneKey === 'Main Vent Sys')

/**
 * Top Vent Trim: moldura metálica rasa em volta da fenda de ventilação, no
 * tampo do console. Emoldura a zona `Main Vent Sys` (a fenda continua sendo a
 * superfície de dado, com os pinos nascendo dela) em vez de cobri-la.
 */
function TopVentTrim() {
  if (!VENT_ZONE) return null
  const [zw, , zd] = VENT_ZONE.args
  const [, , z] = VENT_ZONE.position
  const { h, t, gap } = VENT_TRIM
  const y = COOKTOP_GLASS.yBottom - 0.1 + h / 2
  const innerW = zw + gap * 2
  const innerD = zd + gap * 2
  const metal = { color: C.steelDark, ...TOP_STACK }
  return (
    <group>
      <Panel args={[innerW + t * 2, h, t]} position={[0, y, z + innerD / 2 + t / 2]} {...metal} />
      <Panel args={[innerW + t * 2, h, t]} position={[0, y, z - innerD / 2 - t / 2]} {...metal} />
      <Panel args={[t, h, innerD]} position={[-innerW / 2 - t / 2, y, z]} {...metal} />
      <Panel args={[t, h, innerD]} position={[innerW / 2 + t / 2, y, z]} {...metal} />
    </group>
  )
}

/**
 * Tampa do console: laterais, tampo (partido pela fenda de ventilação, agora
 * emoldurada pelo Top Vent Trim), face frontal e faixa de comando em grafite
 * com o display embutido em rebaixo escuro e a fileira de botões sobre bezels
 * rasos. Sobe inteira em "Abrir console", junto com as zonas da fachada (botões
 * e display), que são filhas do mesmo `<Openable>` — os cilindros dos botões e
 * o box do display são zonas de dado e não são tocados aqui; só o entorno.
 */
function ConsoleCover() {
  const halfW = BACKSPLASH.w / 2
  const { yCenter, yTop, zFront } = CONSOLE
  return (
    <group>
      <Panel args={[0.5, BACKSPLASH.h, BACKSPLASH.d]} position={[-halfW + 0.25, yCenter, CONSOLE.zCenter]} color={C.steel} {...STEEL} />
      <Panel args={[0.5, BACKSPLASH.h, BACKSPLASH.d]} position={[halfW - 0.25, yCenter, CONSOLE.zCenter]} color={C.steel} {...STEEL} />
      <Panel args={[BACKSPLASH.w, 0.5, BACKSPLASH.d]} position={[0, yTop - 0.25, CONSOLE.zCenter]} color={C.steel} {...STEEL} />
      {/* face frontal do console + faixa de comando em grafite escovado */}
      <Panel args={[BACKSPLASH.w, BACKSPLASH.h, 0.4]} position={[0, yCenter, zFront - 0.2]} color={C.steel} {...STEEL} />
      <Panel
        args={[BACKSPLASH.w - 1.6, BACKSPLASH.h - 1.0, 0.22]}
        position={[0, yCenter, zFront + 0.1]}
        color={C.graphite}
        roughness={0.4}
        metalness={0.55}
      />
      {/* rebaixo escuro em volta do display (zona Oven HMI) */}
      {HMI_ZONE && (
        <Panel
          args={[HMI_ZONE.args[0] + 0.8, HMI_ZONE.args[1] + 0.5, 0.14]}
          position={[HMI_ZONE.position[0], HMI_ZONE.position[1], zFront + 0.26]}
          color={C.glass}
          roughness={0.2}
          metalness={0.3}
        />
      )}
      {/* bezel/arruela rasa sob cada botão + indicador em D na frente do cilindro */}
      {KNOB_ZONES.map((knob, i) => {
        const [x, y] = knob.position
        const radius = knob.args[0]
        const height = knob.args[2]
        return (
          <group key={i}>
            <mesh position={[x, y, zFront + 0.27]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[radius + 0.32, radius + 0.32, 0.14, 20]} />
              <ShellMaterial color={C.steelDark} {...STEEL} />
            </mesh>
            <Panel
              args={[0.22, radius * 1.15, 0.12]}
              position={[x, y + radius * 0.12, zFront + height + 0.06]}
              color={C.bodyLight}
              roughness={0.5}
              metalness={0.2}
            />
          </group>
        )
      })}
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
 * Pilha do cooktop, de cima para baixo, cada uma numa `<ExplodeLayer>`:
 * vidro + trim + faixa do console (com as zonas da fachada e a fenda de
 * ventilação em `topExtras`) → elementos radiantes → bandeja com suportes.
 * A pilha inteira sobe em "Levantar cooktop" (`<Openable kind="console">`),
 * revelando a baía da eletrônica, que fica no corpo (ver `ThermalMapScene`).
 *
 * `topExtras` entra **dentro** do `<Openable>`/camada do vidro: é por onde as
 * zonas, pinos e rótulos sobem junto com a peça, sem depender de dois grupos
 * animados manterem-se sincronizados.
 */
export function StoveBody({ topExtras }: { topExtras?: React.ReactNode }) {
  return (
    <group>
      <Cabinet />
      <Cavity />
      <Drawer />
      <Openable kind="console">
        <ExplodeLayer layer="glass">
          <CooktopGlass />
          <TopVentTrim />
          <ConsoleCover />
          <CooktopLoad />
          {topExtras}
        </ExplodeLayer>
        <ExplodeLayer layer="elements">
          <RadiantElements />
          <CooktopGlow />
        </ExplodeLayer>
        <ExplodeLayer layer="tray">
          <CooktopTray />
        </ExplodeLayer>
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
