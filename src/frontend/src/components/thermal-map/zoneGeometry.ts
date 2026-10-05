/**
 * Geometria do fogão 3D (Fase 1c) — ilustrativa, não é CAD.
 *
 * Sistema de coordenadas (unidades arbitrárias, ~3,5 cm cada):
 * - X: -13 (esquerda) … +13 (direita)
 * - Y: -12 (base do corpo) … +12 (topo do cooktop); faixa do console até +16
 * - Z: -9 (traseira) … +9 (frente / porta)
 *
 * As zonas (`ZONE_MESHES`) são superfícies *sobre* o corpo, não blocos
 * flutuantes: painel traseiro, fenda de ventilação, tela do forno na faixa
 * frontal, botões do console, resistência e os dois compartimentos de eletrônica na baía sob o
 * cooktop.
 * `zoneKey` usa exatamente os valores de `SensorPrediction.key_area`.
 */

export const BODY = { w: 26, h: 24, d: 18 }
/**
 * Faixa de comando (backsplash) sobre a borda traseira do cooktop. Fina como
 * no produto real: ~17% da altura do corpo, não uma caixa alta.
 */
export const BACKSPLASH = { w: 24, h: 4, d: 3 }

/** Y do topo do corpo (face superior do cooktop). */
export const BODY_TOP = BODY.h / 2 // 12
/** Z da face frontal do corpo. */
export const BODY_FRONT = BODY.d / 2 // 9
/** Z da face traseira do corpo. */
export const BODY_BACK = -BODY.d / 2 // -9

/** Console: Y da base e do topo, Z da face frontal (voltada para +Z). */
export const CONSOLE = {
  yBottom: BODY_TOP,
  yTop: BODY_TOP + BACKSPLASH.h, // 16
  zFront: BODY_BACK + BACKSPLASH.d, // -6
  zBack: BODY_BACK, // -9
  /** Centro em Y da faixa do console. */
  yCenter: BODY_TOP + BACKSPLASH.h / 2, // 14
  /** Centro em Z da faixa do console. */
  zCenter: BODY_BACK + BACKSPLASH.d / 2, // -7.5
}

/** Quanto o cooktop sobe quando o console é aberto ("Levantar cooktop"), em unidades de cena. */
export const CONSOLE_LIFT = 6

/**
 * Cavidade do forno (caixa aberta para +Z). O teto fica em y = 4,5 para abrir
 * a baía da eletrônica acima dela; abaixo do piso (y = -7,5) fica a gaveta.
 */
export const CAVITY = {
  w: 20,
  h: 12,
  d: 15.5,
  yCenter: -1.5,
  zCenter: 0.2,
}

/**
 * Baía da eletrônica: o vão entre a bandeja do cooktop e o teto da cavidade,
 * onde ficam carcaça, placa, blower e defletor — como no produto real.
 */
export const BAY = {
  /** Teto da cavidade (y do topo da parede). */
  yBottom: CAVITY.yCenter + CAVITY.h / 2 + 0.25, // 4.75
  /** Face inferior da bandeja do cooktop. */
  yTop: 10.85,
  /** Centro em Y das peças da baía. */
  yCenter: 8.0,
  /** Z das peças: recuadas para a traseira, deixando a frente livre. */
  z: -3.0,
}

/** Caixa da carcaça da eletrônica (zona `IPC Comp` + peça `HousingLid`). */
export const HOUSING = {
  w: 7,
  h: 4.2,
  d: 3.4,
  x: 5.5,
  y: BAY.yCenter,
  z: BAY.z,
}

/** Blower (peça) na baía, do lado do `IPC Cooling`. */
export const BLOWER = { x: -5.5, y: BAY.yCenter, z: BAY.z, radius: 1.9 }

/** Defletor: placa vertical entre o blower e a carcaça (normal em X). */
export const DEFLECTOR = { x: 0.4, y: BAY.yCenter, z: BAY.z, h: 4.6, d: 3.6, t: 0.3, holeR: 1.0 }

/** Resistência do forno (zona `Coil Temps`) — visível pelo vidro da porta. */
export const COIL = { y: -1.0, z: 0.2, radius: 5, tube: 0.5 }

/**
 * Posições dos 4 queimadores no cooktop: [x, z]. Índice = "slot".
 * A fileira traseira fica à frente do Top Vent Trim (z > -3,6): nenhum anel
 * passa por baixo do console.
 */
export const BURNER_SLOTS: [number, number][] = [
  [-6.5, -1.2], // 0 traseiro esquerdo
  [-6.5, 4.8], // 1 frontal esquerdo
  [6.5, -1.2], // 2 traseiro direito
  [6.5, 4.8], // 3 frontal direito
]

/**
 * Cooktop de vitrocerâmica (produto real: range elétrica de 30"). O vidro é um
 * painel quase preto recuado dentro de um trim metálico; as resistências
 * radiantes ficam por baixo e só aparecem como anéis serigrafados.
 * `yTop` é onde as cargas (panelas, chapa) se apoiam.
 */
export const COOKTOP_GLASS = {
  thickness: 0.22,
  /** Recuo do vidro em relação à borda do corpo (o trim ocupa essa faixa). */
  inset: 0.7,
  /** Borda traseira do vidro: logo à frente do Top Vent Trim. */
  zRear: -3.5,
  yBottom: BODY_TOP + 0.1,
  yTop: BODY_TOP + 0.1 + 0.22, // 12.32
  trim: { h: 0.32, w: 0.7 },
}

/**
 * Pilha do cooktop, de cima para baixo — as camadas que a vista explodida
 * afasta. Y de cada camada no estado fechado.
 */
export const COOKTOP_STACK = {
  /** Elementos radiantes (espirais) sob o vidro. */
  elementsY: 11.5,
  /** Refletor sob cada elemento. */
  reflectorY: 11.25,
  /** Bandeja de chapa que sustenta os elementos (fecha o corpo por cima). */
  trayY: 10.97,
  trayThickness: 0.25,
}

/**
 * Elementos radiantes serigrafados no vidro, um por `BURNER_SLOTS` (mesmo
 * índice). Layout assimétrico como no produto: diâmetros diferentes e uma zona
 * expansível de anel duplo (`innerRadius`). Decoração — a posição das cargas
 * continua vindo de `BURNER_SLOTS`.
 */
export const COOKTOP_ELEMENTS: { radius: number; innerRadius?: number }[] = [
  { radius: 2.0 }, // 0 traseiro esquerdo — médio
  { radius: 2.6, innerRadius: 1.5 }, // 1 frontal esquerdo — zona expansível (anel duplo)
  { radius: 1.6 }, // 2 traseiro direito — pequeno
  { radius: 2.3 }, // 3 frontal direito — grande
]

/** Elemento auxiliar (aquecimento) entre os traseiros: só serigrafia, sem slot. */
export const COOKTOP_AUX_ELEMENT = { x: 0, z: -1.6, radius: 1.0 }

/**
 * Top Vent Trim: moldura metálica em volta da fenda de ventilação (`Main Vent
 * Sys`) na borda traseira da mesa, entre o vidro e a faixa do console.
 * Emoldura a zona sem cobri-la — a zona continua sendo a superfície de dado.
 */
export const VENT_TRIM = {
  /** Altura da moldura acima da mesa. */
  h: 0.5,
  /** Espessura das barras. */
  t: 0.4,
  /** Folga entre a zona e a moldura. */
  gap: 0.15,
}

/** Y do topo da porta do forno; daí até o vidro do cooktop é a faixa frontal da tela. */
export const DOOR_TOP = 5.9

/**
 * Tela do forno (zona `Oven HMI`) na faixa frontal entre o cooktop e a porta —
 * o arranjo do KitchenAid KOES630SPS: lâmina de vidro preto com os ícones de
 * início e cancelar nas pontas e o display no centro. O display é a zona de
 * dado; o resto da lâmina (`glassW` × `glassH`) é decoração em volta dele.
 */
export const HMI_SCREEN = {
  y: 9.4,
  w: 7.4,
  h: 2.6,
  /** Lâmina de vidro: topo rente à face do corpo, frente em `BODY_FRONT + glassT`. */
  glassW: 15.4,
  glassH: 3.7,
  glassT: 0.25,
  /** Quanto o display sobressai da frente da lâmina. */
  proud: 0.09,
  /** Espessura do box do display. */
  t: 0.16,
  /** X dos dois botões que ladeiam a tela (decoração, como os do KitchenAid). */
  knobX: 10.1,
}

/** Gaveta de armazenamento sob o forno: frente estática, entre o piso da cavidade e a base. */
export const DRAWER = {
  /** Topo da gaveta = dobradiça da porta (`DOOR_HINGE_Y` em `Openable.tsx`). */
  yTop: -BODY.h / 2 + 4.6, // -7.4
  yBottom: -11.7,
  handleY: -9.3,
}

export type ZoneShape = 'box' | 'cylinder' | 'torus'

/**
 * Textura de relevo da zona (ver `detailTextures.zoneSurface`): estampagem,
 * venezianas, espiras. Só mexe no valor/relevo — a cor da zona é o dado.
 */
export type ZoneSurface = 'mainback' | 'coil' | 'duct' | 'housing' | 'vent'

export interface ZoneMeshDef {
  zoneKey: string
  shape: ZoneShape
  /**
   * box: [largura, altura, profundidade]
   * cylinder: [raioTopo, raioBase, altura, segmentosRadiais]
   * torus: [raio, espessuraDoTubo, segmentosRadiais, segmentosTubulares]
   */
  args: number[]
  position: [number, number, number]
  rotation?: [number, number, number]
  /** `true` quando a zona fica dentro do corpo (só aparece em corte/raio-X). */
  interior?: boolean
  /** `true` para zonas na fachada do console: são fatiadas junto com ela. */
  facade?: boolean
  /**
   * Camada animada a que a zona pertence: `top` sobe com o cooktop (abertura
   * `console` e vista explodida), `bay` sobe com a baía da eletrônica na vista
   * explodida, e `rear` acompanha o painel traseiro (recua em "Abrir traseira" e
   * na explosão). Sem valor, a zona fica parada no corpo.
   */
  layer?: 'top' | 'bay' | 'rear'
  /** Relevo procedural da superfície; sem valor, a zona é lisa. */
  surface?: ZoneSurface
}

/** X dos 5 botões: dois à esquerda e três à direita do display, como no produto. */
export const KNOB_XS = [-10.0, -7.2, 5.2, 8.0, 10.8]

/** CT Knobs — fileira de 5 botões na faixa de comando do console. */
const ctKnobs: ZoneMeshDef[] = KNOB_XS.map((x) => ({
  zoneKey: 'CT Knobs',
  shape: 'cylinder',
  args: [0.95, 0.95, 0.9, 20],
  position: [x, CONSOLE.yCenter, CONSOLE.zFront + 0.45],
  rotation: [Math.PI / 2, 0, 0],
  facade: true,
  layer: 'top',
}))

export const ZONE_MESHES: ZoneMeshDef[] = [
  ...ctKnobs,
  // Oven HMI — display na faixa frontal, entre a porta do forno e o cooktop
  {
    zoneKey: 'Oven HMI',
    shape: 'box',
    args: [HMI_SCREEN.w, HMI_SCREEN.h, HMI_SCREEN.t],
    position: [0, HMI_SCREEN.y, BODY_FRONT + HMI_SCREEN.glassT + HMI_SCREEN.proud - HMI_SCREEN.t / 2],
    facade: true,
  },
  // Main Vent Sys — fenda do Top Vent Trim, na borda traseira da mesa
  {
    zoneKey: 'Main Vent Sys',
    shape: 'box',
    args: [18, 0.9, 1.7],
    position: [0, BODY_TOP + 0.15, -5.0],
    layer: 'top',
    surface: 'vent',
  },
  // Mainback — face do painel traseiro do corpo
  {
    zoneKey: 'Mainback',
    shape: 'box',
    args: [24, 20, 0.4],
    position: [0, 0, BODY_BACK - 0.25],
    layer: 'rear',
    surface: 'mainback',
  },
  // IPC Comp — fundo da carcaça da eletrônica (a caixa em volta é a peça
  // `HousingLid`, aberta na frente para deixar ver a placa)
  {
    zoneKey: 'IPC Comp',
    shape: 'box',
    args: [HOUSING.w, HOUSING.h, 0.35],
    position: [HOUSING.x, HOUSING.y, HOUSING.z - HOUSING.d / 2],
    interior: true,
    layer: 'bay',
    surface: 'housing',
  },
  // IPC Cooling — duto de resfriamento ao lado do blower, na baía
  {
    zoneKey: 'IPC Cooling',
    shape: 'box',
    args: [3.2, 3.6, 3.2],
    position: [-9.4, BAY.yCenter, BAY.z],
    interior: true,
    layer: 'bay',
    surface: 'duct',
  },
  // Coil Temps — resistência dentro da cavidade do forno
  {
    zoneKey: 'Coil Temps',
    shape: 'torus',
    // malha fina: o anel de 5 u de raio com 32 segmentos virava um polígono visível
    args: [COIL.radius, COIL.tube, 16, 96],
    position: [0, COIL.y, COIL.z],
    rotation: [Math.PI / 2, 0, 0],
    interior: true,
    surface: 'coil',
  },
]

/** Todas as `zoneKey` com geometria conhecida. */
export const GEOMETRY_ZONE_KEYS = [...new Set(ZONE_MESHES.map((m) => m.zoneKey))]

/** Zonas que vivem na fachada do console: fatiadas junto com ela no modo Corte. */
export const FACADE_ZONE_KEYS = new Set(ZONE_MESHES.filter((m) => m.facade).map((m) => m.zoneKey))
/** Zonas da camada do cooktop: sobem com ele (abertura `console` e vista explodida). */
export const TOP_ZONE_KEYS = new Set(ZONE_MESHES.filter((m) => m.layer === 'top').map((m) => m.zoneKey))
/** Zonas do painel traseiro: recuam com ele ("Abrir traseira" e vista explodida). */
export const REAR_ZONE_KEYS = new Set(ZONE_MESHES.filter((m) => m.layer === 'rear').map((m) => m.zoneKey))
/** Zonas da baía da eletrônica: sobem com ela na vista explodida. */
export const BAY_ZONE_KEYS = new Set(ZONE_MESHES.filter((m) => m.layer === 'bay').map((m) => m.zoneKey))

/* ------------------------------------------------------------------ *
 * Fase 1d — caixas de enquadramento, âncoras de rótulo e pinos
 * ------------------------------------------------------------------ */

export type Bounds = { min: [number, number, number]; max: [number, number, number] }

/** Quanto a caixa de ligação e o cabo saem do painel traseiro (além da zona Mainback). */
export const REAR_HARDWARE_DEPTH = 1.5

/** Y do chão (base dos pés). Espelha `FLOOR_Y` de `StoveBody`. */
export const FLOOR_Y_BOUND = -BODY.h / 2 - 1.8

/**
 * Caixa do fogão inteiro — corpo, console/backsplash, porta (com puxador) e
 * pés. Derivada das constantes acima em vez de `Box3.setFromObject` porque as
 * aberturas animadas (console/traseira/forno) mudariam a caixa a cada quadro
 * e porque `<Html>`/`InstancedMesh` distorcem o cálculo a partir da cena.
 */
export const STOVE_BOUNDS: Bounds = {
  min: [-BODY.w / 2, FLOOR_Y_BOUND, BODY_BACK - REAR_HARDWARE_DEPTH],
  max: [BODY.w / 2, CONSOLE.yTop, BODY_FRONT + 2.2],
}

/**
 * Caixa do "andar de cima" — faixa do console, cooktop, a baía da eletrônica
 * sob ele e a tela do forno na faixa frontal — usada pelo preset de câmera
 * "Console".
 */
export const CONSOLE_BOUNDS: Bounds = {
  min: [-BODY.w / 2, BAY.yBottom - 1, CONSOLE.zBack - 0.6],
  max: [BODY.w / 2, CONSOLE.yTop + 1, BODY_FRONT + HMI_SCREEN.glassT + 0.5],
}

/** Extensão (meia-largura em X/Y/Z) de um mesh de zona, por forma. */
function halfExtent(def: ZoneMeshDef): [number, number, number] {
  if (def.shape === 'box') {
    const [w, h, d] = def.args
    return [w / 2, h / 2, d / 2]
  }
  if (def.shape === 'cylinder') {
    const [rt, rb, h] = def.args
    const r = Math.max(rt, rb)
    // Os cilindros de zona são deitados (rotação em X): altura vira Z.
    return def.rotation ? [r, r, h / 2] : [r, h / 2, r]
  }
  const [radius, tube] = def.args
  const r = radius + tube
  // Torus deitado no plano XZ.
  return def.rotation ? [r, tube, r] : [r, r, tube]
}

/** Caixa envolvente de todos os meshes de uma zona (união). */
export function zoneBounds(zoneKey: string): Bounds | null {
  const defs = ZONE_MESHES.filter((d) => d.zoneKey === zoneKey)
  if (defs.length === 0) return null
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const def of defs) {
    const h = halfExtent(def)
    for (let a = 0; a < 3; a += 1) {
      min[a] = Math.min(min[a], def.position[a] - h[a])
      max[a] = Math.max(max[a], def.position[a] + h[a])
    }
  }
  return { min, max }
}

/** Centro da caixa de uma zona — âncora dos rótulos e das linhas-guia. */
export function zoneAnchor(zoneKey: string): [number, number, number] | null {
  const b = zoneBounds(zoneKey)
  if (!b) return null
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]
}

/**
 * Direção fixa em que o rótulo de cada zona se afasta do fogão. São escolhidas
 * à mão (e não calculadas) para que os 7 rótulos nunca se sobreponham na vista
 * isométrica padrão — é a "prevenção de colisão" desta escala.
 */
export const ZONE_LABEL_OFFSETS: Record<string, [number, number, number]> = {
  'Main Vent Sys': [0, 11, 0],
  'IPC Comp': [22, 7, 0],
  'IPC Cooling': [-24, 11, 6],
  'Oven HMI': [-22, -2, 0],
  'CT Knobs': [22, -6, 0],
  Mainback: [-28, -7, 4],
  'Coil Temps': [14, -10, 10],
}

/** Deslocamento padrão para uma zona sem entrada em `ZONE_LABEL_OFFSETS`. */
export const DEFAULT_LABEL_OFFSET: [number, number, number] = [16, 8, 8]

export function zoneLabelOffset(zoneKey: string): [number, number, number] {
  return ZONE_LABEL_OFFSETS[zoneKey] ?? DEFAULT_LABEL_OFFSET
}

/**
 * Face em que os pinos de sensor nascem, por zona: eixo (0=X, 1=Y, 2=Z) e
 * sentido. É declarado à mão porque "para fora" não é dedutível da caixa —
 * o painel traseiro olha para -Z enquanto os botões, que também estão em z
 * negativo, olham para +Z; e as zonas internas olham para a abertura por onde
 * o console é visto, não para fora do fogão.
 */
export const ZONE_PIN_FACE: Record<string, { axis: 0 | 1 | 2; sign: 1 | -1 }> = {
  Mainback: { axis: 2, sign: -1 },
  'CT Knobs': { axis: 2, sign: 1 },
  'Oven HMI': { axis: 2, sign: 1 },
  'Main Vent Sys': { axis: 1, sign: 1 },
  'IPC Comp': { axis: 2, sign: 1 },
  'IPC Cooling': { axis: 0, sign: 1 },
  'Coil Temps': { axis: 1, sign: 1 },
}
