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
import type {
  Architecture,
  Metadata,
  PredictionRequest,
  PredictionResponse,
  StoveConfig,
} from '@/contract/v1'

export interface QueryState {
  architecture: Architecture
  /** `null` enquanto o metadata não chegou. */
  config: StoveConfig | null
  /** Vazio = todas as áreas. */
  areas: string[]
  /** Vazio = todos os sensores das áreas escolhidas. */
  sensors: number[]
}

/** Consulta salva durante a sessão para que possa ser reaberta posteriormente. */
export interface HistoryEntry {
  id: number
  /** Título editável da consulta, iniciado como "Consulta N". */
  name: string
  /** Mesmo `request_id` retornado pelo preditor; nulo enquanto a previsão carrega. */
  record: string | null
  /** Momento em que a previsão foi submetida, em ISO-8601. */
  createdAt: string
  request: PredictionRequest
}

export interface ConfigStore extends QueryState {
  metadata: Metadata | undefined
  /** Requisição já submetida (o que a área de resultados mostra). */
  request: PredictionRequest | null
  /** `true` quando a configuração mudou depois da última submissão. */
  isDirty: boolean
  /** `true` quando a mesma arquitetura, configuração e recorte já estão no histórico. */
  hasDuplicateHistory: boolean
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
  /** Consultas submetidas manualmente, na ordem em que foram criadas. */
  history: HistoryEntry[]
  setHoveredVariable: (field: keyof StoveConfig | null) => void
  setArchitecture: (value: Architecture) => void
  setField: (field: keyof StoveConfig, value: string) => void
  toggleArea: (area: string) => void
  setAllAreas: () => void
  toggleSensor: (tcNumber: number) => void
  clearSensors: () => void
  submit: () => void
  /** Restaura a configuração e o recorte de uma consulta salva. */
  restoreHistory: (entry: HistoryEntry) => void
  /** Associa ao histórico o identificador e o instante retornados pelo preditor. */
  recordHistoryPrediction: (request: PredictionRequest, response: PredictionResponse) => void
  renameHistory: (id: number, name: string) => void
  deleteHistory: (id: number) => void
  /** Submete a configuração atual para todas as áreas e sensores. */
  runAll: () => void
  clearSelection: () => void
  /** Clicar na mesma área limpa a seleção; clicar em outra troca o filtro. */
  selectKeyArea: (area: string | null) => void
}

const ConfigStoreContext = createContext<ConfigStore | null>(null)

export function buildRequest(state: QueryState): PredictionRequest | null {
  if (!state.config) return null
  const targets: NonNullable<PredictionRequest['targets']> = {}
  // Uma seleção explícita de sensores é mais específica que o recorte por área.
  // Enviar ambos faria as fontes tratarem os filtros como união e retornarem
  // todos os sensores das áreas escolhidas.
  if (state.sensors.length > 0) {
    targets.sensors = [...state.sensors].sort((a, b) => a - b)
  } else if (state.areas.length > 0) {
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

function stateFromRequest(request: PredictionRequest): QueryState {
  return {
    architecture: request.architecture,
    config: { ...request.config },
    areas: request.targets?.key_areas ? [...request.targets.key_areas] : [],
    sensors: request.targets?.sensors ? [...request.targets.sensors] : [],
  }
}

function cloneRequest(request: PredictionRequest): PredictionRequest {
  return {
    architecture: request.architecture,
    config: { ...request.config },
    targets: request.targets
      ? {
          key_areas: request.targets.key_areas ? [...request.targets.key_areas] : undefined,
          sensors: request.targets.sensors ? [...request.targets.sensors] : undefined,
        }
      : undefined,
  }
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
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const nextHistoryId = useRef(1)
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

  function saveToHistory(nextRequest: PredictionRequest) {
    const entry: HistoryEntry = {
      id: nextHistoryId.current,
      name: `Consulta ${nextHistoryId.current}`,
      record: null,
      createdAt: new Date().toISOString(),
      request: cloneRequest(nextRequest),
    }
    nextHistoryId.current += 1
    setHistory((current) => [...current, entry])
  }

  /** Aplica o novo estado e já o submete (usado por ações que re-consultam). */
  function commit(next: QueryState, saveHistory = false) {
    setState(next)
    const nextRequest = buildRequest(next)
    setRequest(nextRequest)
    if (saveHistory && nextRequest) saveToHistory(nextRequest)
  }

  // Preenchimento inicial + predição automática na primeira carga.
  useEffect(() => {
    if (!metadata || state.config) return
    commit({
      architecture: 'BR',
      config: { ...metadata.reference_config },
      areas: [],
      sensors: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, state.config])

  const value = useMemo<ConfigStore>(() => {
    const pending = buildRequest(state)
    const hasDuplicateHistory =
      pending !== null && history.some((entry) => sameRequest(entry.request, pending))
    return {
      ...state,
      metadata,
      request,
      isDirty: !sameRequest(pending, request),
      hasDuplicateHistory,
      selectedKeyArea,
      highlightPart,
      hoveredVariable,
      history,
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
      // `areas: []` significa "todas". Desmarcar uma caixa nesse estado precisa
      // materializar a lista completa menos a área clicada — senão o usuário
      // desmarca uma e acaba com apenas ela selecionada.
      toggleArea: (area) =>
        setState((prev) => {
          const all = (metadata?.key_areas ?? []).map((a) => a.name)
          const current = prev.areas.length > 0 ? prev.areas : all
          const next = current.includes(area)
            ? current.filter((a) => a !== area)
            : [...current, area]
          return {
            ...prev,
            // Voltar a marcar todas equivale a "todas" (recorte vazio).
            areas: next.length === all.length ? [] : next,
            sensors: [],
          }
        }),
      setAllAreas: () => setState((prev) => ({ ...prev, areas: [], sensors: [] })),
      toggleSensor: (tc) =>
        setState((prev) => ({
          ...prev,
          sensors: prev.sensors.includes(tc)
            ? prev.sensors.filter((s) => s !== tc)
            : [...prev.sensors, tc],
        })),
      clearSensors: () => setState((prev) => ({ ...prev, sensors: [] })),
      // Salva antes de atualizar o resultado: mesmo que o usuário altere o
      // formulário em seguida, a consulta acabada de prever continua acessível.
      submit: () => {
        if (!pending || hasDuplicateHistory) return
        saveToHistory(pending)
        setRequest(pending)
      },
      restoreHistory: (entry) => {
        const restored = stateFromRequest(entry.request)
        setState(restored)
        setRequest(cloneRequest(entry.request))
        setSelectedKeyArea(null)
      },
      recordHistoryPrediction: (submittedRequest, response) =>
        setHistory((current) => {
          // Uma mesma configuração pode ser prevista mais de uma vez. Atualizamos
          // somente a última entrada ainda sem resposta para não sobrescrever uma
          // consulta anterior idêntica.
          const entryIndex = current.findLastIndex(
            (entry) => entry.record === null && sameRequest(entry.request, submittedRequest),
          )
          if (entryIndex < 0) return current
          return current.map((entry, index) =>
            index === entryIndex
              ? {
                  ...entry,
                  record: response.request_id,
                  createdAt: response.generated_at,
                }
              : entry,
          )
        }),
      renameHistory: (id, name) => {
        const nextName = name.trim()
        if (!nextName) return
        setHistory((current) =>
          current.map((entry) => (entry.id === id ? { ...entry, name: nextName } : entry)),
        )
      },
      deleteHistory: (id) =>
        setHistory((current) => current.filter((entry) => entry.id !== id)),
      runAll: () => {
        const next = { ...state, areas: [], sensors: [] }
        const nextRequest = buildRequest(next)
        if (nextRequest && history.some((entry) => sameRequest(entry.request, nextRequest))) return
        commit(next, true)
      },
      clearSelection: () => setState((prev) => ({ ...prev, areas: [], sensors: [] })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, metadata, request, selectedKeyArea, highlightPart, hoveredVariable, history])

  return <ConfigStoreContext.Provider value={value}>{children}</ConfigStoreContext.Provider>
}

export function useConfigStore(): ConfigStore {
  const ctx = useContext(ConfigStoreContext)
  if (!ctx) throw new Error('useConfigStore precisa estar dentro de <ConfigStoreProvider>.')
  return ctx
}
