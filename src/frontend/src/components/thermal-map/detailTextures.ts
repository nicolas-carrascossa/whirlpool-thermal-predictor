/**
 * Texturas procedurais do fogão 3D, desenhadas num canvas — sem arquivo e sem
 * rede. Servem de `map` / `bumpMap` / `roughnessMap` para dar a aparência de
 * material (aço escovado, placa de circuito, chapa perfurada, bobina) às peças,
 * sem somar geometria.
 *
 * Tudo aqui é **opcional e degradável**: onde não há canvas 2D (jsdom nos
 * testes, SSR) as funções devolvem `null` e o material cai para a cor lisa.
 * As texturas são cacheadas — uma por tipo (e por repetição, no aço) —, nunca
 * recriadas a cada renderização.
 */
import * as THREE from 'three'

import type { ZoneSurface } from './zoneGeometry'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

/** Gerador pseudoaleatório determinístico: a mesma textura em toda execução. */
function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function canvasTexture(
  w: number,
  h: number,
  draw: Draw,
  opts: { srgb?: boolean; repeat?: [number, number]; wrap?: boolean } = {},
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace
  if (opts.wrap !== false) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1])
  tex.anisotropy = 4
  return tex
}

const cache = new Map<string, unknown>()
function cached<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}

/* ------------------------------------------------------------------ *
 * Aço escovado
 * ------------------------------------------------------------------ */

/**
 * Média do mapa de rugosidade do aço (≈ 0,8): o material compensa com 1/0,8
 * para que o grão varie o brilho sem mudar o tom médio da carcaça.
 */
export const BRUSHED_ROUGH_MEAN = 0.8

export interface BrushedSet {
  rough: THREE.CanvasTexture
  bump: THREE.CanvasTexture
}

/** Fibras horizontais finas: o grão do inox escovado de porta de forno. */
function brushedDraw(base: number, spread: number, seed: number, fibers = 3800): Draw {
  return (ctx, w, h) => {
    const rand = rng(seed)
    ctx.fillStyle = `rgb(${base},${base},${base})`
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < fibers; i += 1) {
      const y = rand() * h
      const x = rand() * w
      const len = 30 + rand() * 280
      const tone = Math.max(0, Math.min(255, base + (rand() - 0.5) * spread))
      ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.3 + rand() * 0.45})`
      ctx.fillRect(x, y, len, 1)
      if (x + len > w) ctx.fillRect(x - w, y, len, 1) // costura: o grão é contínuo
    }
  }
}

/**
 * Conjunto de aço escovado para uma repetição (rx × ry) de textura por face.
 * A repetição acompanha o tamanho da peça (um ladrilho a cada ~`GRAIN_TILE`
 * unidades), para o grão ter a mesma escala numa porta larga e numa lateral
 * estreita. Ladrilho grande de propósito: a fibra de 1 texel precisa ter cerca
 * de 1 pixel na vista padrão, senão o mipmap a apaga e o aço vira cor lisa.
 */
export const GRAIN_TILE = 24

export function brushedSteel(rx: number, ry: number): BrushedSet | null {
  const key = `brushed:${rx.toFixed(1)}x${ry.toFixed(1)}`
  return cached(key, () => {
    const base = cached('brushed:base', () => {
      const rough = canvasTexture(512, 512, brushedDraw(Math.round(BRUSHED_ROUGH_MEAN * 255), 100, 23, 4200))
      const bump = canvasTexture(512, 512, brushedDraw(128, 120, 37, 4200))
      return rough && bump ? { rough, bump } : null
    })
    if (!base) return null
    const variant = (t: THREE.CanvasTexture) => {
      const c = t.clone()
      c.needsUpdate = true
      c.repeat.set(rx, ry)
      return c
    }
    return { rough: variant(base.rough), bump: variant(base.bump) }
  })
}

/* ------------------------------------------------------------------ *
 * Placa de circuito (PCB)
 * ------------------------------------------------------------------ */

/**
 * Desenha a face de uma placa: verde-acinzentado dessaturado (a placa não
 * compete com o dado), trilhas de cobre em ângulo reto, ilhas de solda, furos
 * de fixação e serigrafia. `traces` escala com a área para a densidade ficar
 * igual numa placa pequena e numa tira longa.
 */
function pcbDraw(traces: number, seed: number): Draw {
  return (ctx, w, h) => {
    const rand = rng(seed)
    ctx.fillStyle = '#44544a'
    ctx.fillRect(0, 0, w, h)
    // leve variação de resina
    for (let i = 0; i < traces * 13; i += 1) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${0.012 + rand() * 0.02})`
      ctx.fillRect(rand() * w, rand() * h, 6 + rand() * 30, 3 + rand() * 12)
    }
    // trilhas ortogonais (Manhattan): cobre, tom quente e discreto
    ctx.lineCap = 'square'
    for (let i = 0; i < traces; i += 1) {
      const x = rand() * w
      const y = rand() * h
      const horizontalFirst = rand() < 0.5
      const len1 = 30 + rand() * 120
      const len2 = 20 + rand() * 80
      ctx.strokeStyle = rand() < 0.3 ? '#8c9a74' : '#74835f'
      ctx.lineWidth = rand() < 0.2 ? 5 : 2.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      if (horizontalFirst) {
        ctx.lineTo(x + len1, y)
        ctx.lineTo(x + len1, y + len2)
      } else {
        ctx.lineTo(x, y + len2)
        ctx.lineTo(x + len1, y + len2)
      }
      ctx.stroke()
      // ilhas de solda nas pontas
      ctx.fillStyle = '#b8bfa4'
      ctx.beginPath()
      ctx.arc(x, y, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    // furos de fixação nos cantos
    for (const [cx, cy] of [
      [18, 18],
      [w - 18, 18],
      [18, h - 18],
      [w - 18, h - 18],
    ]) {
      ctx.fillStyle = '#2a332d'
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#b8bfa4'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    // serigrafia: pequenos traços brancos (designadores)
    ctx.fillStyle = 'rgba(235,235,225,0.55)'
    for (let i = 0; i < traces * 0.6; i += 1) ctx.fillRect(rand() * w, rand() * h, 10 + rand() * 18, 2)
  }
}

/** Placa de controle: 4,4 × 2,6 u (proporção ~1,7). */
export function pcbTexture(): THREE.CanvasTexture | null {
  return cached('pcb', () => canvasTexture(512, 300, pcbDraw(70, 91), { srgb: true, wrap: false }))
}

/** Tira longa da placa dos encoders do console (proporção ~7,8). */
export function knobBoardTexture(): THREE.CanvasTexture | null {
  return cached('knobboard', () => canvasTexture(1560, 200, pcbDraw(150, 57), { srgb: true, wrap: false }))
}

/* ------------------------------------------------------------------ *
 * Chapa perfurada / com venezianas (carcaça, painel traseiro)
 * ------------------------------------------------------------------ */

export interface SurfaceSet {
  map?: THREE.CanvasTexture
  bump?: THREE.CanvasTexture
  rough?: THREE.CanvasTexture
}

/**
 * Painel traseiro estampado (`Mainback`): banco de venezianas no alto, nervuras
 * de reforço, rebaixo da caixa de ligação embaixo e cabeças de parafuso nas
 * bordas. O desenho é simétrico em X, então não importa o sentido do U na face.
 * Vai como `bumpMap` + um `map` quase branco que só escurece as fendas: a cor
 * da zona (o dado) continua sendo a do material.
 */
export function mainbackSurface(): SurfaceSet | null {
  return cached('mainback', () => {
    const W = 960
    const H = 800
    const slot = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
      ctx.fillRect(x, y, w, h)
    }
    const drawBump: Draw = (ctx, w, h) => {
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, w, h)
      // nervuras verticais de reforço (estampadas: ressaltadas)
      ctx.fillStyle = '#b4b4b4'
      for (const x of [0.06, 0.5 - 0.004, 0.94 - 0.012]) slot(ctx, w * x, h * 0.04, w * 0.012, h * 0.92)
      // banco de venezianas: fendas fundas em grade 14 x 5
      ctx.fillStyle = '#101010'
      for (let r = 0; r < 5; r += 1) {
        for (let c = 0; c < 14; c += 1) {
          slot(ctx, w * (0.12 + c * 0.055), h * (0.08 + r * 0.045), w * 0.04, h * 0.022)
        }
      }
      // moldura ressaltada do banco
      ctx.strokeStyle = '#c4c4c4'
      ctx.lineWidth = 7
      ctx.strokeRect(w * 0.1, h * 0.065, w * 0.8, h * 0.26)
      // rebaixo da caixa de ligação (embaixo, à direita) e etiqueta (à esquerda)
      ctx.fillStyle = '#585858'
      slot(ctx, w * 0.62, h * 0.66, w * 0.3, h * 0.26)
      ctx.fillStyle = '#9a9a9a'
      slot(ctx, w * 0.08, h * 0.74, w * 0.28, h * 0.16)
      // parafusos: domos pequenos nas bordas
      ctx.fillStyle = '#d0d0d0'
      for (const [x, y] of [
        [0.04, 0.03],
        [0.96, 0.03],
        [0.04, 0.97],
        [0.96, 0.97],
        [0.04, 0.5],
        [0.96, 0.5],
        [0.5, 0.03],
        [0.5, 0.97],
      ]) {
        ctx.beginPath()
        ctx.arc(w * x, h * y, 11, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const drawMap: Draw = (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      // nervuras, moldura do banco e rebaixo da caixa de ligação: mais escuros,
      // para a estampagem se ler mesmo de longe (o relevo sozinho some em face plana)
      ctx.fillStyle = '#cfcfcf'
      for (const x of [0.06, 0.5 - 0.004, 0.94 - 0.012]) slot(ctx, w * x, h * 0.04, w * 0.012, h * 0.92)
      ctx.fillStyle = '#dcdcdc'
      slot(ctx, w * 0.62, h * 0.66, w * 0.3, h * 0.26)
      ctx.strokeStyle = '#c4c4c4'
      ctx.lineWidth = 6
      ctx.strokeRect(w * 0.1, h * 0.065, w * 0.8, h * 0.26)
      ctx.fillStyle = '#6a6a6a'
      for (let r = 0; r < 5; r += 1) {
        for (let c = 0; c < 14; c += 1) {
          slot(ctx, w * (0.12 + c * 0.055), h * (0.08 + r * 0.045), w * 0.04, h * 0.022)
        }
      }
    }
    const bump = canvasTexture(W, H, drawBump, { wrap: false })
    const map = canvasTexture(W, H, drawMap, { srgb: true, wrap: false })
    return bump && map ? { bump, map } : null
  })
}

/**
 * Bobina enrolada: espiras finas perpendiculares ao tubo de um toro (o U do
 * toro corre ao longo do anel). O relevo dá a crista de cada espira; o mapa
 * escurece o vale entre elas — mexe no valor, não no matiz, então a cor de
 * status da zona continua legível.
 */
export function coilWindSurface(): SurfaceSet | null {
  return cached('coilwind', () => {
    const turns = 72
    const wind = (lo: number, hi: number): Draw => (ctx, w, h) => {
      ctx.fillStyle = `rgb(${hi},${hi},${hi})`
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < turns; i += 1) {
        const x = (i / turns) * w
        const g = ctx.createLinearGradient(x, 0, x + w / turns, 0)
        g.addColorStop(0, `rgb(${hi},${hi},${hi})`)
        g.addColorStop(0.62, `rgb(${hi},${hi},${hi})`)
        g.addColorStop(1, `rgb(${lo},${lo},${lo})`)
        ctx.fillStyle = g
        ctx.fillRect(x, 0, w / turns, h)
      }
    }
    const bump = canvasTexture(1024, 32, wind(30, 235))
    const map = canvasTexture(1024, 32, wind(120, 255), { srgb: true })
    return bump && map ? { bump, map } : null
  })
}

/** Duto de resfriamento: nervuras horizontais de reforço e vales escurecidos. */
export function ductSurface(): SurfaceSet | null {
  return cached('duct', () => {
    const ribs = (base: number, lo: number, hi: number): Draw => (ctx, w, h) => {
      ctx.fillStyle = `rgb(${base},${base},${base})`
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 9; i += 1) {
        const y = h * (0.1 + i * 0.1)
        const g = ctx.createLinearGradient(0, y, 0, y + h * 0.05)
        g.addColorStop(0, `rgb(${hi},${hi},${hi})`)
        g.addColorStop(1, `rgb(${lo},${lo},${lo})`)
        ctx.fillStyle = g
        ctx.fillRect(w * 0.06, y, w * 0.88, h * 0.05)
      }
    }
    const bump = canvasTexture(256, 256, ribs(128, 20, 225), { wrap: false })
    const map = canvasTexture(256, 256, ribs(255, 130, 255), { srgb: true, wrap: false })
    return bump && map ? { bump, map } : null
  })
}

/** Carcaça da eletrônica (parede de fundo): fendas de ventilação e moldura estampada. */
export function housingBackSurface(): SurfaceSet | null {
  return cached('housingback', () => {
    const slots = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 12; c += 1) ctx.fillRect(w * (0.1 + c * 0.07), h * (0.14 + r * 0.2), w * 0.045, h * 0.06)
      }
    }
    const bump = canvasTexture(
      512,
      300,
      (ctx, w, h) => {
        ctx.fillStyle = '#808080'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#101010'
        slots(ctx, w, h)
        ctx.strokeStyle = '#d0d0d0'
        ctx.lineWidth = 6
        ctx.strokeRect(w * 0.04, h * 0.06, w * 0.92, h * 0.88)
      },
      { wrap: false },
    )
    const map = canvasTexture(
      512,
      300,
      (ctx, w, h) => {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#5c5c5c'
        slots(ctx, w, h)
      },
      { srgb: true, wrap: false },
    )
    return bump && map ? { bump, map } : null
  })
}

/**
 * Fenda de ventilação (`Main Vent Sys`): duas fileiras de rasgos retangulares.
 * O mapa escurece os rasgos e o relevo os afunda; o resto da face continua com
 * a cor de status da zona.
 */
export function ventSurface(): SurfaceSet | null {
  return cached('vent', () => {
    const cols = 30
    const slots = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const pitch = (w * 0.976) / cols
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < cols; c += 1) ctx.fillRect(w * 0.012 + c * pitch, h * (0.12 + r * 0.45), pitch * 0.62, h * 0.31)
      }
    }
    const bump = canvasTexture(
      1590,
      150,
      (ctx, w, h) => {
        ctx.fillStyle = '#808080'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#0c0c0c'
        slots(ctx, w, h)
      },
      { wrap: false },
    )
    const map = canvasTexture(
      1590,
      150,
      (ctx, w, h) => {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#4a4a4a'
        slots(ctx, w, h)
      },
      { srgb: true, wrap: false },
    )
    return bump && map ? { bump, map } : null
  })
}

/** Textura de cada zona que tem uma (`ZoneMeshDef.surface`). */
export function zoneSurface(kind: ZoneSurface | undefined): SurfaceSet | null {
  if (kind === 'mainback') return mainbackSurface()
  if (kind === 'coil') return coilWindSurface()
  if (kind === 'duct') return ductSurface()
  if (kind === 'housing') return housingBackSurface()
  if (kind === 'vent') return ventSurface()
  return null
}

/* ------------------------------------------------------------------ *
 * Tela do console (Oven HMI)
 * ------------------------------------------------------------------ */

/**
 * Vidro do console no padrão do KitchenAid KOES630SPS: a lâmina preta com os
 * ícones de início (esq.) e cancelar (dir.) em contorno quadrado. A região
 * central — o display — fica de fora: é a zona de dado, que se encaixa ali.
 */
export function hmiGlassTexture(widthUnits: number, heightUnits: number, iconX: number): THREE.CanvasTexture | null {
  return cached(`hmiglass:${widthUnits}x${heightUnits}:${iconX}`, () => {
    const pxPerUnit = 110
    const W = Math.round(widthUnits * pxPerUnit)
    const H = Math.round(heightUnits * pxPerUnit)
    return canvasTexture(
      W,
      H,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        // reflexo difuso na diagonal: o vidro "pega" a luz do ambiente
        const g = ctx.createLinearGradient(0, 0, w, h)
        g.addColorStop(0, 'rgba(255,255,255,0.10)')
        g.addColorStop(0.45, 'rgba(255,255,255,0.0)')
        g.addColorStop(1, 'rgba(255,255,255,0.04)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)

        const stroke = '#a9afc2'
        const size = 1.15 * pxPerUnit
        for (const side of [-1, 1] as const) {
          const cx = w / 2 + side * iconX * pxPerUnit
          const cy = h / 2
          ctx.strokeStyle = stroke
          ctx.lineWidth = 3
          const r = 8
          ctx.beginPath()
          if (typeof ctx.roundRect === 'function') ctx.roundRect(cx - size / 2, cy - size / 2, size, size, r)
          else ctx.rect(cx - size / 2, cy - size / 2, size, size)
          ctx.stroke()
          ctx.lineWidth = 3.2
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          ctx.beginPath()
          if (side === -1) {
            // início: casa
            const s = size * 0.28
            ctx.moveTo(cx - s, cy + s * 0.9)
            ctx.lineTo(cx - s, cy - s * 0.1)
            ctx.lineTo(cx, cy - s)
            ctx.lineTo(cx + s, cy - s * 0.1)
            ctx.lineTo(cx + s, cy + s * 0.9)
            ctx.closePath()
            ctx.moveTo(cx - s * 0.28, cy + s * 0.9)
            ctx.lineTo(cx - s * 0.28, cy + s * 0.3)
            ctx.lineTo(cx + s * 0.28, cy + s * 0.3)
            ctx.lineTo(cx + s * 0.28, cy + s * 0.9)
          } else {
            // cancelar: X
            const s = size * 0.24
            ctx.moveTo(cx - s, cy - s)
            ctx.lineTo(cx + s, cy + s)
            ctx.moveTo(cx + s, cy - s)
            ctx.lineTo(cx - s, cy + s)
          }
          ctx.stroke()
        }
      },
      { srgb: true, wrap: false },
    )
  })
}

/**
 * Conteúdo do display: hora grande, data pequena e o filete fino acima — o
 * mesmo arranjo da tela de referência. O fundo é a cor de status da zona
 * (cinza, verde, âmbar ou vermelho, sempre de luminância média), então o texto
 * é quase preto: contraste ≥ 4:1 em todas elas, o que o branco não dá no
 * cinza e no âmbar. Não é cacheado: a hora muda.
 */
export function hmiClockTexture(widthUnits: number, heightUnits: number, date: Date): THREE.CanvasTexture | null {
  const pxPerUnit = 150
  const W = Math.round(widthUnits * pxPerUnit)
  const H = Math.round(heightUnits * pxPerUnit)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const day = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return canvasTexture(
    W,
    H,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.shadowColor = 'rgba(255,255,255,0.35)'
      ctx.shadowBlur = 6
      ctx.fillStyle = '#14171a'
      ctx.fillRect(w / 2 - w * 0.07, h * 0.09, w * 0.14, 4) // filete superior
      ctx.font = `700 ${Math.round(h * 0.46)}px "Nunito Sans", "Segoe UI", system-ui, sans-serif`
      ctx.fillText(time, w / 2, h * 0.6)
      ctx.font = `600 ${Math.round(h * 0.19)}px "Nunito Sans", "Segoe UI", system-ui, sans-serif`
      ctx.fillText(day, w / 2, h * 0.86)
    },
    { srgb: true, wrap: false },
  )
}

/** Etiqueta de série (traseira): fundo claro e linhas de texto simuladas. */
export function dataPlateTexture(): THREE.CanvasTexture | null {
  return cached('dataplate', () =>
    canvasTexture(
      400,
      220,
      (ctx, w, h) => {
        ctx.fillStyle = '#e8e8e2'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#2b2d30'
        ctx.font = '700 28px "Segoe UI", system-ui, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('RANGE · 30"', 18, 44)
        ctx.font = '500 17px "Segoe UI", system-ui, sans-serif'
        const rows = ['MODEL  ELECTRIC FREESTANDING', 'VOLTS  240 V ~  60 Hz', 'TOTAL  9.6 kW', 'SERIAL  ---- ------']
        rows.forEach((r, i) => ctx.fillText(r, 18, 80 + i * 26))
        ctx.fillStyle = '#2b2d30'
        for (let i = 0; i < 38; i += 1) ctx.fillRect(18 + i * 9.4, 186, 3 + (i % 3), 20) // código de barras
        ctx.strokeStyle = '#2b2d30'
        ctx.lineWidth = 3
        ctx.strokeRect(4, 4, w - 8, h - 8)
      },
      { srgb: true, wrap: false },
    ),
  )
}
