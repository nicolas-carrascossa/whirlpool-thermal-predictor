/**
 * Estado da consulta (arquitetura, 7 variáveis, recorte de áreas/sensores) e a
 * requisição efetivamente submetida. Context + useState: o estado é pequeno,
 * vive numa única tela e não justifica uma store externa.
 *
 * A tela nunca abre vazia: assim que o metadata chega, a configuração de
 * referência é preenchida e uma predição é submetida automaticamente.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { VARIABLE_TO_PART, type PartId } from '@/components/thermal-map/parts'
import type { Architecture, Metadata, PredictionRequest, StoveConfig } from '@/contract/v1'

export interface QueryState {
  architecture: Architecture
  /** `null` enquanto o metadata não chegou. */
  config: StoveConfig | null
  /**
   * Lista explícita das áreas selecionadas. "Todas" = todos os nomes de
   * `metadata.key_areas`; vazio = nenhuma (estado sem requisição possível).
   */
  areas: string[]
  /** Vazio = todos os sensores das áreas escolhidas. */
  sensors: number[]
}

export interface ConfigStore extends QueryState {
  metadata: Metadata | undefined
  /** Requisição já submetida (o que a área de resultados mostra). */
  request: PredictionRequest | null
  /** `true` quando a configuração mudou depois da última submissão. */
  isDirty: boolean
  /** `key_area` selecionada no mapa 3D ou nos cards de resultado; `null` = todas visíveis. */
  selectedKeyArea: string | null
  /**
   * Peça que deve pulsar ~1,1 s em `--wp-accent` no mapa 3D, disparada pela
   * última variável alterada no formulário (Fase 1c, etapa C). `null` fora do
   * pulso.
   */
  highlightPart: PartId | null
  /** Variável cujo select/legenda está sob o cursor — destaque contínuo no 3D. */
  hoveredVariable: keyof StoveConfig | null
  setHoveredVariable: (field: keyof StoveConfig | null) => void
  setArchitecture: (value: Architecture) => void
  setField: (field: keyof StoveConfig, value: string) => void
  toggleArea: (area: string) => void
  setAllAreas: () => void
  toggleSensor: (tcNumber: number) => void
  /** Marca de uma vez os sensores informados (substitui a seleção atual). */
  setAllSensors: (tcNumbers: number[]) => void
  clearSensors: () => void
  submit: () => void
  /** Submete a configuração atual para todas as áreas e sensores. */
  runAll: () => void
  clearSelection: () => void
  /** Clicar na mesma área limpa a seleção; clicar em outra troca o filtro. */
  selectKeyArea: (area: string | null) => void
}

const ConfigStoreContext = createContext<ConfigStore | null>(null)

/**
 * Monta a requisição a partir do estado. `allAreas` é a lista completa de
 * `metadata.key_areas`: com ela dá para saber se o recorte é parcial (envia
 * `key_areas`) ou total (omite `targets`, que o contrato v1 lê como "todos").
 *
 * Nenhuma área selecionada não é representável no contrato — `targets` vazio
 * significaria "todos os sensores" — então devolve `null`.
 */
export function buildRequest(state: QueryState, allAreas: string[]): PredictionRequest | null {
  if (!state.config) return null
  if (state.areas.length === 0) return null
  const targets: NonNullable<PredictionRequest['targets']> = {}
  const isPartialAreaSelection = state.areas.length < allAreas.length
  // Uma seleção explícita de sensores é mais específica que o recorte por área.
  // Enviar ambos faria as fontes tratarem os filtros como união e retornarem
  // todos os sensores das áreas escolhidas.
  if (state.sensors.length > 0) {
    targets.sensors = [...state.sensors].sort((a, b) => a - b)
  } else if (isPartialAreaSelection) {
    targets.key_areas = [...state.areas].sort()
  }
  return {
    architecture: state.architecture,
    config: { ...state.config },
    targets: Object.keys(targets).length > 0 ? targets : undefined,
  }
}

function sameRequest(a: PredictionRequest | null, b: PredictionRequest | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function ConfigStoreProvider({
  metadata,
  children,
}: {
  metadata: Metadata | undefined
  children: ReactNode
}) {
  const [state, setState] = useState<QueryState>({
    architecture: 'BR',
    config: null,
    areas: [],
    sensors: [],
  })
  const [request, setRequest] = useState<PredictionRequest | null>(null)
  const [selectedKeyArea, setSelectedKeyArea] = useState<string | null>(null)
  const [hoveredVariable, setHoveredVariable] = useState<keyof StoveConfig | null>(null)
  const [highlightPart, setHighlightPart] = useState<PartId | null>(null)
  const highlightSetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Pulsa a peça mapeada da variável alterada. Reseta para `null` antes de
   * marcar a peça de novo — assim, se a mesma peça for alterada duas vezes
   * seguidas rapidamente (ex.: duas variáveis mapeadas na mesma peça), o
   * pulso reinicia em vez de ficar "preso" no mesmo valor.
   */
  function pulseHighlight(field: keyof StoveConfig) {
    const part = VARIABLE_TO_PART[field]
    if (highlightSetTimer.current) clearTimeout(highlightSetTimer.current)
    if (highlightClearTimer.current) clearTimeout(highlightClearTimer.current)
    setHighlightPart(null)
    if (!part) return
    highlightSetTimer.current = setTimeout(() => {
      setHighlightPart(part)
      highlightClearTimer.current = setTimeout(() => setHighlightPart(null), 1100)
    }, 0)
  }

  useEffect(
    () => () => {
      if (highlightSetTimer.current) clearTimeout(highlightSetTimer.current)
      if (highlightClearTimer.current) clearTimeout(highlightClearTimer.current)
    },
    [],
  )

  /** Nomes de todas as áreas do metadata — o valor de `areas` no estado "todas". */
  const allAreas = useMemo(() => (metadata?.key_areas ?? []).map((a) => a.name), [metadata])

  /** Aplica o novo estado e já o submete (usado por ações que re-consultam). */
  function commit(next: QueryState) {
    setState(next)
    setRequest(buildRequest(next, allAreas))
  }

  // Preenchimento inicial + predição automática na primeira carga.
  useEffect(() => {
    if (!metadata || state.config) return
    commit({
      architecture: 'BR',
      config: { ...metadata.reference_config },
      areas: allAreas,
      sensors: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, state.config])

  const value = useMemo<ConfigStore>(() => {
    const pending = buildRequest(state, allAreas)
    return {
      ...state,
      metadata,
      request,
      isDirty: !sameRequest(pending, request),
      selectedKeyArea,
      highlightPart,
      hoveredVariable,
      setHoveredVariable,
      selectKeyArea: (area) => setSelectedKeyArea((current) => (current === area ? null : area)),
      // A arquitetura re-submete na hora: a indisponibilidade do México precisa
      // aparecer sem exigir um clique em "Prever".
      setArchitecture: (architecture) => commit({ ...state, architecture }),
      setField: (field, val) => {
        setState((prev) =>
          prev.config ? { ...prev, config: { ...prev.config, [field]: val } } : prev,
        )
        pulseHighlight(field)
      },
      // `areas` é a lista literal: desmarcar a última área deixa zero
      // selecionadas (e sem requisição possível), em vez de voltar a "todas".
      // Mudar o recorte de áreas descarta a seleção de sensores.
      toggleArea: (area) =>
        setState((prev) => ({
          ...prev,
          areas: prev.areas.includes(area)
            ? prev.areas.filter((a) => a !== area)
            : [...prev.areas, area],
          sensors: [],
        })),
      setAllAreas: () => setState((prev) => ({ ...prev, areas: allAreas, sensors: [] })),
      toggleSensor: (tc) =>
        setState((prev) => ({
          ...prev,
          sensors: prev.sensors.includes(tc)
            ? prev.sensors.filter((s) => s !== tc)
            : [...prev.sensors, tc],
        })),
      setAllSensors: (tcNumbers) => setState((prev) => ({ ...prev, sensors: [...tcNumbers] })),
      clearSensors: () => setState((prev) => ({ ...prev, sensors: [] })),
      // `pending` é `null` sem área selecionada: nesse caso não há o que submeter.
      submit: () => {
        if (pending) setRequest(pending)
      },
      runAll: () => commit({ ...state, areas: allAreas, sensors: [] }),
      clearSelection: () => setState((prev) => ({ ...prev, areas: allAreas, sensors: [] })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, metadata, allAreas, request, selectedKeyArea, highlightPart, hoveredVariable])

  return <ConfigStoreContext.Provider value={value}>{children}</ConfigStoreContext.Provider>
}

export function useConfigStore(): ConfigStore {
  const ctx = useContext(ConfigStoreContext)
  if (!ctx) throw new Error('useConfigStore precisa estar dentro de <ConfigStoreProvider>.')
  return ctx
}
