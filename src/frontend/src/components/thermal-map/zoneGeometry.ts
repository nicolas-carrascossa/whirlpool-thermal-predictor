/**
 * Geometria do fogão 3D (Fase 1c) — ilustrativa, não é CAD.
 *
 * Sistema de coordenadas (unidades arbitrárias, ~3,5 cm cada):
 * - X: -13 (esquerda) … +13 (direita)
 * - Y: -12 (base do corpo) … +12 (topo do cooktop); console vai até +22
 * - Z: -9 (traseira) … +9 (frente / porta)
 *
 * As zonas (`ZONE_MESHES`) são superfícies *sobre* o corpo, não blocos
 * flutuantes: painel traseiro, fenda de ventilação, display do console,
 * botões, resistência e os dois compartimentos de eletrônica no console.
 * `zoneKey` usa exatamente os valores de `SensorPrediction.key_area`.
 */

export const BODY = { w: 26, h: 24, d: 18 }
/** Backsplash/console: caixa sobre a traseira do corpo. */
export const BACKSPLASH = { w: 24, h: 10, d: 5.5 }

/** Y do topo do corpo (face superior do cooktop). */
export const BODY_TOP = BODY.h / 2 // 12
/** Z da face frontal do corpo. */
export const BODY_FRONT = BODY.d / 2 // 9
/** Z da face traseira do corpo. */
export const BODY_BACK = -BODY.d / 2 // -9

/** Console: Y da base e do topo, Z da face frontal (voltada para +Z). */
export const CONSOLE = {
  yBottom: BODY_TOP,
  yTop: BODY_TOP + BACKSPLASH.h, // 22
  zFront: BODY_BACK + BACKSPLASH.d, // -3.5
  zBack: BODY_BACK, // -9
  /** Centro em Y da caixa do console. */
  yCenter: BODY_TOP + BACKSPLASH.h / 2, // 17
  /** Centro em Z da caixa do console. */
  zCenter: BODY_BACK + BACKSPLASH.d / 2, // -6.25
}

/** Cavidade do forno (caixa aberta para +Z). */
export const CAVITY = {
  w: 20,
  h: 17,
  d: 15.5,
  yCenter: -1.5,
  zCenter: 0.2,
}

/** Caixa da carcaça da eletrônica (zona `IPC Comp` + peça `HousingLid`). */
export const HOUSING = {
  w: 7,
  h: 4.2,
  d: 3.4,
  x: 5.5,
  y: 16.3,
  z: CONSOLE.zCenter,
}

/** Blower (peça) dentro do console, do lado do `IPC Cooling`. */
export const BLOWER = { x: -5.5, y: 16.5, z: CONSOLE.zCenter, radius: 1.9 }

/** Defletor: placa vertical entre o blower e a carcaça (normal em X). */
export const DEFLECTOR = { x: 0.4, y: 16.3, z: CONSOLE.zCenter, h: 6, d: 3.6, t: 0.3, holeR: 1.0 }

/** Resistência do forno (zona `Coil Temps`) — visível pelo vidro da porta. */
export const COIL = { y: -1.0, z: 0.2, radius: 5, tube: 0.5 }

/** Posições dos 4 queimadores no cooktop: [x, z]. Índice = "slot". */
export const BURNER_SLOTS: [number, number][] = [
  [-6.5, -4.5], // 0 traseiro esquerdo
  [-6.5, 4.5], // 1 frontal esquerdo
  [6.5, -4.5], // 2 traseiro direito
  [6.5, 4.5], // 3 frontal direito
]

export type ZoneShape = 'box' | 'cylinder' | 'torus'

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
}

/** CT Knobs — fileira de 5 botões na faixa de comando do console. */
const ctKnobs: ZoneMeshDef[] = Array.from({ length: 5 }, (_, i) => ({
  zoneKey: 'CT Knobs',
  shape: 'cylinder',
  args: [0.95, 0.95, 0.9, 20],
  position: [-8 + i * 4, 14.4, CONSOLE.zFront + 0.45],
  rotation: [Math.PI / 2, 0, 0],
  facade: true,
}))

export const ZONE_MESHES: ZoneMeshDef[] = [
  ...ctKnobs,
  // Oven HMI — display na faixa de comando do console
  {
    zoneKey: 'Oven HMI',
    shape: 'box',
    args: [9, 2.6, 0.35],
    position: [-4.5, 18.6, CONSOLE.zFront + 0.18],
    facade: true,
  },
  // Main Vent Sys — fenda de saída de ar no topo do console
  {
    zoneKey: 'Main Vent Sys',
    shape: 'box',
    args: [18, 0.9, 1.7],
    position: [0, CONSOLE.yTop - 0.45, -5.95],
  },
  // Mainback — face do painel traseiro do corpo
  { zoneKey: 'Mainback', shape: 'box', args: [24, 20, 0.4], position: [0, 0, BODY_BACK - 0.25] },
  // IPC Comp — fundo da carcaça da eletrônica (a caixa em volta é a peça
  // `HousingLid`, aberta na frente para deixar ver a placa)
  {
    zoneKey: 'IPC Comp',
    shape: 'box',
    args: [HOUSING.w, HOUSING.h, 0.35],
    position: [HOUSING.x, HOUSING.y, HOUSING.z - HOUSING.d / 2],
    interior: true,
  },
  // IPC Cooling — duto de resfriamento ao lado do blower, dentro do console
  {
    zoneKey: 'IPC Cooling',
    shape: 'box',
    args: [3.2, 3.6, 3.2],
    position: [-9.4, 16.4, CONSOLE.zCenter],
    interior: true,
  },
  // Coil Temps — resistência dentro da cavidade do forno
  {
    zoneKey: 'Coil Temps',
    shape: 'torus',
    args: [COIL.radius, COIL.tube, 12, 32],
    position: [0, COIL.y, COIL.z],
    rotation: [Math.PI / 2, 0, 0],
    interior: true,
  },
]

/** Todas as `zoneKey` com geometria conhecida. */
export const GEOMETRY_ZONE_KEYS = [...new Set(ZONE_MESHES.map((m) => m.zoneKey))]

/** Zonas que vivem na fachada do console: sobem junto com a tampa ao abri-la. */
export const FACADE_ZONE_KEYS = new Set(ZONE_MESHES.filter((m) => m.facade).map((m) => m.zoneKey))

/* ------------------------------------------------------------------ *
 * Fase 1d — caixas de enquadramento, âncoras de rótulo e pinos
 * ------------------------------------------------------------------ */

export type Bounds = { min: [number, number, number]; max: [number, number, number] }

/** Y do chão (base dos pés). Espelha `FLOOR_Y` de `StoveBody`. */
export const FLOOR_Y_BOUND = -BODY.h / 2 - 1.8

/**
 * Caixa do fogão inteiro — corpo, console/backsplash, porta (com puxador) e
 * pés. Derivada das constantes acima em vez de `Box3.setFromObject` porque as
 * aberturas animadas (console/traseira/forno) mudariam a caixa a cada quadro
 * e porque `<Html>`/`InstancedMesh` distorcem o cálculo a partir da cena.
 */
export const STOVE_BOUNDS: Bounds = {
  min: [-BODY.w / 2, FLOOR_Y_BOUND, BODY_BACK - 0.6],
  max: [BODY.w / 2, CONSOLE.yTop, BODY_FRONT + 2.2],
}

/** Caixa só do console/backsplash — usada pelo preset de câmera "Console". */
export const CONSOLE_BOUNDS: Bounds = {
  min: [-BACKSPLASH.w / 2, BODY_TOP - 1, CONSOLE.zBack - 0.6],
  max: [BACKSPLASH.w / 2, CONSOLE.yTop + 1, CONSOLE.zFront + 1.5],
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
  'Main Vent Sys': [0, 9, 0],
  'IPC Comp': [22, 5, 0],
  'IPC Cooling': [-22, 8, 7],
  'Oven HMI': [-22, -7, 0],
  'CT Knobs': [22, -8, 0],
  Mainback: [-28, 2, 4],
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
