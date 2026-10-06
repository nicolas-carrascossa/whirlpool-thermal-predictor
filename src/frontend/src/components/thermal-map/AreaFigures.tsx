/**
 * Figuras 3D das áreas (`key_area`) — as que ilustram os cartões da faixa de
 * áreas dos resultados. Cada figura é montada com os mesmos componentes do
 * fogão 3D do mapa térmico: a zona de dado e as peças e acabamentos que o fogão
 * desenha em volta dela. Nada é redesenhado aqui: se uma peça mudar no mapa, a
 * figura muda junto.
 *
 * A zona de dado tem uma cor fixa e neutra (`FIGURE_ZONE_COLOR`): a figura
 * identifica a peça, não diz se ela está dentro do limite — quem diz isso é o
 * ponto de status do próprio cartão. No mapa, a mesma zona é pintada pelo status.
 *
 * As peças ficam nas coordenadas do fogão. Cada figura só declara a caixa que
 * a envolve (`bounds`), que serve para centrar e escalar o conjunto no
 * quadrado do cartão, e de qual lado ela deve ser vista (`baseYawDeg`).
 *
 * As caixas foram medidas na própria cena (a caixa de cada conjunto, já com as
 * peças assentadas), não calculadas à mão: fios, parafusos e a tampa aberta da
 * carcaça mudam o tamanho real. Se uma peça mudar de dimensão no mapa, refaça a
 * medida da figura correspondente.
 */

import { useRef, type ReactNode } from 'react'
import type * as THREE from 'three'

import { CoolingDuctTrim } from './CoolingDuctTrim'
import { HmiScreen } from './HmiScreen'
import { TurboDuct } from './MainVentParts'
import { BlowerBody } from './parts/BlowerBody'
import { ControlBoard } from './parts/ControlBoard'
import { HousingLid } from './parts/HousingLid'
import { BakeElementHardware, ConsoleCover, RearPanels } from './StoveBody'
import { ZoneMesh } from './ZoneMesh'
import { ZONE_GRAY_HEX } from './colorScale'
import { ZONE_MESHES, type Bounds } from './zoneGeometry'
import { FALLBACK_CONFIG } from './parts'
import type { StoveConfig } from '@/contract/v1'

const noop = () => {}

/** Cor da zona de dado nas figuras: o cinza neutro de zona do mapa, sem relação com o status. */
export const FIGURE_ZONE_COLOR = ZONE_GRAY_HEX

/**
 * Configuração das figuras: a de referência, com a carcaça aberta, para a tampa
 * não esconder a placa. As figuras ilustram a área, não o estado da consulta.
 */
export const FIGURE_CONFIG: StoveConfig = { ...FALLBACK_CONFIG, housing: 'Open' }

/** A zona de dado da área (um ou mais meshes), na cor fixa das figuras. */
function Zones({ area }: { area: string }) {
  return (
    <>
      {ZONE_MESHES.map((def, i) =>
        def.zoneKey === area ? (
          <ZoneMesh
            key={i}
            def={def}
            color={FIGURE_ZONE_COLOR}
            isZoneActive={false}
            onHoverZone={noop}
            onUnhoverZone={noop}
            onClickZone={noop}
            tooltip={null}
          />
        ) : null,
      )}
    </>
  )
}

/** O blower sem o envelope interativo da peça configurável (tooltip e pulso). */
function BlowerAssembly() {
  const fan = useRef<THREE.Group>(null!)
  return <BlowerBody fan={fan} />
}

export interface AreaFigureSpec {
  /** Caixa que envolve a figura, nas coordenadas do fogão. */
  bounds: Bounds
  /** De que lado a figura é vista em repouso (0 = pela frente do fogão). */
  baseYawDeg: number
  /** Peças e zona da área. */
  render: () => ReactNode
}

/** Vista padrão: a frente e uma lateral, para a forma ler como 3D. */
const FRONT_YAW = 32
/** O painel traseiro está do lado de trás do fogão. */
const REAR_YAW = 180 + FRONT_YAW

export const AREA_FIGURES: Record<string, AreaFigureSpec> = {
  // Painel traseiro estampado, caixa de ligação, cordão e etiqueta de série.
  Mainback: {
    bounds: { min: [-13, -12, -10.45], max: [13, 16, -8.4] },
    baseYawDeg: REAR_YAW,
    render: () => (
      <>
        <RearPanels />
        <Zones area="Mainback" />
      </>
    ),
  },
  // Resistência do forno com as pontas, os isoladores e a placa de terminais.
  'Coil Temps': {
    bounds: { min: [-5.5, -1.9, -7.3], max: [5.5, -0.1, 5.7] },
    baseYawDeg: FRONT_YAW,
    render: () => (
      <>
        <BakeElementHardware />
        <Zones area="Coil Temps" />
      </>
    ),
  },
  // Blower AC (voluta, rotor e motor) com o duto turbo que sobe da saída.
  'Main Vent Sys': {
    bounds: { min: [-7.1, 4.75, -4.75], max: [-3.2, 10.85, -2] },
    baseYawDeg: FRONT_YAW,
    render: () => (
      <>
        <BlowerAssembly />
        <TurboDuct />
      </>
    ),
  },
  // Duto de resfriamento ao lado do blower, com o flange parafusado.
  'IPC Cooling': {
    bounds: { min: [-11, 5.9, -4.9], max: [-7.5, 10.1, -1.1] },
    baseYawDeg: FRONT_YAW,
    render: () => (
      <>
        <Zones area="IPC Cooling" />
        <CoolingDuctTrim />
      </>
    ),
  },
  // Carcaça da eletrônica de potência, com a tampa levantada, e a placa.
  'IPC Comp': {
    bounds: { min: [1.2, 5.75, -5.15], max: [9.8, 15, -1.15] },
    baseYawDeg: FRONT_YAW,
    render: () => (
      <>
        <Zones area="IPC Comp" />
        <HousingLid />
        <ControlBoard />
      </>
    ),
  },
  // Lâmina de vidro da faixa frontal: display com hora, ícones e botões.
  'Oven HMI': {
    bounds: { min: [-11.4, 7.4, 9], max: [11.4, 11.4, 10.15] },
    baseYawDeg: 14,
    render: () => (
      <>
        <HmiScreen />
        <Zones area="Oven HMI" />
      </>
    ),
  },
  // Faixa de comando do console, os cinco botões e a placa de encoders atrás.
  'CT Knobs': {
    bounds: { min: [-12, 12, -9], max: [12.1, 16, -4.95] },
    baseYawDeg: 22,
    render: () => (
      <>
        <ConsoleCover />
        <Zones area="CT Knobs" />
      </>
    ),
  },
}

/** Ângulo de repouso: o topo da figura aparece, para a forma ler como 3D. */
export const REST_TILT_DEG = 24

/** Respiro que o cartão guarda nas laterais em volta da figura, em px (soma dos dois lados). */
const TILE_SIDE_PADDING = 16

/**
 * Escala (px por unidade do fogão) que acomoda a figura no cartão, qualquer que
 * seja o giro: na largura, pela diagonal da base (o pior ângulo de uma figura
 * comprida) contra a largura útil do cartão; na altura, pelo quadrado da figura,
 * contando o quanto a inclinação alonga a base na tela.
 *
 * `size` é o lado do quadrado reservado; `tileWidth`, a largura do cartão.
 * Devolve também a largura e a altura que a figura ocupa em repouso.
 */
export function figureFit(
  { min, max }: Bounds,
  { size, tileWidth }: { size: number; tileWidth: number },
): { scale: number; width: number; height: number } {
  const dx = max[0] - min[0]
  const dy = max[1] - min[1]
  const dz = max[2] - min[2]
  const baseDiagonal = Math.hypot(dx, dz)
  const tilt = (REST_TILT_DEG * Math.PI) / 180
  const projectedHeight = dy * Math.cos(tilt) + baseDiagonal * Math.sin(tilt)
  const scale = Math.min(
    Math.max(tileWidth - TILE_SIDE_PADDING, size) / baseDiagonal,
    (size * 1.1) / projectedHeight,
  )
  return { scale, width: scale * baseDiagonal, height: scale * projectedHeight }
}

export function figureCenter({ min, max }: Bounds): [number, number, number] {
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
}
