import { createContext, useContext, type ReactNode } from 'react'
import * as THREE from 'three'

import type { StoveConfig } from '@/contract/v1'

import type { PartId, PartState } from './parts'

export type StoveView = 'solid' | 'cutaway' | 'xray'

/**
 * Aberturas semânticas (Fase 1d, etapa A) — substituem o slider como controle
 * principal. Várias podem estar abertas ao mesmo tempo.
 */
export interface OpeningState {
  /** Tampa do console levantada: mostra carcaça, blower, defletor e placa. */
  console: boolean
  /** Painel traseiro afastado: mostra o fundo do console e o caminho do ar. */
  rear: boolean
  /** Porta do forno abaixada ~80°: mostra a resistência e o suporte. */
  oven: boolean
}

/** Padrão ao abrir: console aberto (área com mais sensores), o resto fechado. */
export const DEFAULT_OPENINGS: OpeningState = { console: true, rear: false, oven: false }

export interface StoveContextValue {
  view: StoveView
  /** Plano de corte compartilhado (mutado no lugar pelo slider, sem re-render). */
  clipPlanes: THREE.Plane[]
  /** Profundidade do corte em % — usada pela tampa escura da face cortada. */
  cutDepth: number
  config: StoveConfig
  parts: PartState
  openings: OpeningState
  /** Peça que deve pulsar em `--wp-accent` (etapa C). */
  highlightPart: PartId | null
  /** Peça sob o cursor — tinge as setas de ar em `--wp-accent` (etapa B). */
  hoveredPart: PartId | null
  /** Animações instantâneas quando o usuário pede menos movimento. */
  reducedMotion: boolean
  onHoverPart: (partId: PartId | null) => void
}

const StoveContext = createContext<StoveContextValue | null>(null)

/**
 * Provider criado *dentro* do `<Canvas>`: o react-three-fiber usa um
 * reconciler próprio, então um contexto criado fora da Canvas não atravessa a
 * fronteira sem bridge.
 */
export function StoveProvider({ value, children }: { value: StoveContextValue; children: ReactNode }) {
  return <StoveContext.Provider value={value}>{children}</StoveContext.Provider>
}

export function useStove(): StoveContextValue {
  const ctx = useContext(StoveContext)
  if (!ctx) throw new Error('useStove precisa estar dentro de <StoveProvider>')
  return ctx
}

/** Amortecimento exponencial independente de framerate (~400 ms para `lambda = 8`). */
export function damp(current: number, target: number, delta: number, lambda = 8): number {
  return current + (target - current) * (1 - Math.exp(-lambda * Math.min(delta, 0.1)))
}
