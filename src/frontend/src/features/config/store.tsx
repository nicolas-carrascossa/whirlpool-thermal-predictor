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
  /**
   * Lista explícita das áreas selecionadas. "Todas" = todos os nomes de
   * `metadata.key_areas`; vazio = nenhuma (estado sem requisição possível).
   */
  areas: string[]
  /** Vazio = todos os sensores das áreas escolhidas. */
  sensors: number[]
}

/**
 * Como a consulta em andamento é tratada, escolhido na tela de início:
 *  - `save`: fica no Histórico com o nome dado; cada previsão ATUALIZA essa mesma
 *    entrada (não cria outra), então o histórico sempre guarda a última;
 *  - `view`: só visualização momentânea, nada é salvo.
 * `null` = ainda na tela de início (nenhuma escolha feita).
 */
export type Session =
  | { mode: 'save'; name: string; /** Entrada do histórico desta consulta; `null` até a 1ª previsão. */ entryId: number | null }
  | { mode: 'view' }

/** Consulta salva durante a sessão para que possa ser reaberta posteriormente. */
export interface HistoryEntry {
  id: number
  /** Título da consulta: o nome dado na tela de início (editável no histórico). */
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
  /**
   * Pedido para o mapa 3D levar a câmera até uma peça (clique numa linha de
   * "Configuração selecionada"). `token` muda a cada clique, então clicar de
   * novo na mesma peça reenquadra.
   */
  focusRequest: { part: PartId; token: number } | null
  /** Consultas registradas, na ordem em que foram criadas. */
  history: HistoryEntry[]
  /** Consulta em andamento; `null` na tela de início. */
  session: Session | null
  /**
   * `false` (padrão) = visão "não técnico": nas tabelas de sensor só aparecem os
   * que pedem atenção (em atenção ou acima do limite). `true` = visão técnica,
   * com todos os sensores, inclusive os dentro do limite. O gráfico de barras
   * sempre mostra todos, nos dois modos.
   */
  technicianView: boolean
  setTechnicianView: (value: boolean) => void
  /** Sai da tela de início: `name` registra no histórico; `null` é só visualização. */
  startSession: (name: string | null) => void
  /** "Nova consulta": volta à tela de início com a configuração de referência. */
  endSession: () => void
  setHoveredVariable: (field: keyof StoveConfig | null) => void
  /** Leva o mapa 3D até a peça da variável e a faz pulsar. Sem peça (`losses`), não faz nada. */
  focusVariable: (field: keyof StoveConfig) => void
  setArchitecture: (value: Architecture) => void
  setField: (field: keyof StoveConfig, value: string) => void
  toggleArea: (area: string) => void
  setAllAreas: () => void
  toggleSensor: (tcNumber: number) => void
  /** Marca de uma vez os sensores informados (substitui a seleção atual). */
  setAllSensors: (tcNumbers: number[]) => void
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

function stateFromRequest(request: PredictionRequest, allAreas: string[]): QueryState {
  return {
    architecture: request.architecture,
    config: { ...request.config },
    // Sem `key_areas`, o contrato representa todas as áreas. Restaurar a lista
    // explícita evita que a interface interprete esse estado como "nenhuma".
    areas: request.targets?.key_areas ? [...request.targets.key_areas] : [...allAreas],
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
  const [session, setSession] = useState<Session | null>(null)
  const [technicianView, setTechnicianView] = useState(false)
  const nextHistoryId = useRef(1)
  const [selectedKeyArea, setSelectedKeyArea] = useState<string | null>(null)
  const [hoveredVariable, setHoveredVariable] = useState<keyof StoveConfig | null>(null)
  const [highlightPart, setHighlightPart] = useState<PartId | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ part: PartId; token: number } | null>(null)
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

  /** Entrada do histórico da consulta em andamento (modo `save`), se já existir. */
  const sessionEntry =
    session?.mode === 'save' && session.entryId !== null
      ? history.find((entry) => entry.id === session.entryId)
      : undefined

  /**
   * Registra a previsão da consulta em andamento. Só no modo `save`, e sempre na
   * MESMA entrada: a 1ª previsão cria; as seguintes trocam a requisição e zeram o
   * resultado até a resposta chegar.
   */
  function saveToHistory(nextRequest: PredictionRequest) {
    if (session?.mode !== 'save') return
    if (sessionEntry) {
      setHistory((current) =>
        current.map((entry) =>
          entry.id === sessionEntry.id
            ? { ...entry, record: null, createdAt: new Date().toISOString(), request: cloneRequest(nextRequest) }
            : entry,
        ),
      )
      return
    }
    const entry: HistoryEntry = {
      id: nextHistoryId.current,
      name: session.name,
      record: null,
      createdAt: new Date().toISOString(),
      request: cloneRequest(nextRequest),
    }
    nextHistoryId.current += 1
    setHistory((current) => [...current, entry])
    setSession({ ...session, entryId: entry.id })
  }

  /** Aplica o novo estado e já o submete (usado por ações que re-consultam). */
  function commit(next: QueryState, saveHistory = false) {
    setState(next)
    const nextRequest = buildRequest(next, allAreas)
    setRequest(nextRequest)
    if (saveHistory && nextRequest) saveToHistory(nextRequest)
  }

  // Preenchimento inicial do formulário, sem submeter nenhuma predição ainda:
  // o meio só mostra resultado depois do primeiro clique em "Prever".
  useEffect(() => {
    if (!metadata || state.config) return
    setState({
      architecture: 'BR',
      config: { ...metadata.reference_config },
      areas: allAreas,
      sensors: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, state.config])

  const value = useMemo<ConfigStore>(() => {
    const pending = buildRequest(state, allAreas)
    // Só vale no modo `save`: prever de novo sem mudar nada não acrescenta nada à
    // consulta registrada. Na visualização momentânea não há nada a duplicar.
    const hasDuplicateHistory =
      pending !== null && !!sessionEntry && sameRequest(sessionEntry.request, pending)
    return {
      ...state,
      metadata,
      request,
      isDirty: !sameRequest(pending, request),
      hasDuplicateHistory,
      selectedKeyArea,
      highlightPart,
      hoveredVariable,
      focusRequest,
      history,
      session,
      technicianView,
      setTechnicianView,
      startSession: (name) => setSession(name === null ? { mode: 'view' } : { mode: 'save', name, entryId: null }),
      endSession: () => {
        setSession(null)
        setSelectedKeyArea(null)
        setRequest(null)
        if (metadata) {
          setState({ architecture: 'BR', config: { ...metadata.reference_config }, areas: allAreas, sensors: [] })
        }
      },
      setHoveredVariable,
      focusVariable: (field) => {
        const part = VARIABLE_TO_PART[field]
        if (!part) return
        setFocusRequest((prev) => ({ part, token: (prev?.token ?? 0) + 1 }))
        pulseHighlight(field)
      },
      selectKeyArea: (area) => setSelectedKeyArea((current) => (current === area ? null : area)),
      // A arquitetura re-submete na hora (só se já houve previsão): a
      // indisponibilidade do México precisa aparecer sem exigir um novo
      // clique em "Prever". Antes da 1ª previsão, só atualiza o rascunho.
      setArchitecture: (architecture) =>
        request ? commit({ ...state, architecture }) : setState((prev) => ({ ...prev, architecture })),
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
      // Salva antes de atualizar o resultado: mesmo que o usuário altere o
      // formulário em seguida, a consulta acabada de prever continua acessível.
      submit: () => {
        if (!pending || hasDuplicateHistory) return
        saveToHistory(pending)
        setRequest(pending)
      },
      restoreHistory: (entry) => {
        const restored = stateFromRequest(entry.request, allAreas)
        setState(restored)
        setRequest(cloneRequest(entry.request))
        setSelectedKeyArea(null)
        // Reabrir continua ESSA consulta: as próximas previsões a atualizam.
        setSession({ mode: 'save', name: entry.name, entryId: entry.id })
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
      deleteHistory: (id) => {
        setHistory((current) => current.filter((entry) => entry.id !== id))
        // Apagou a consulta em andamento: a próxima previsão a registra de novo, com o mesmo nome.
        if (session?.mode === 'save' && session.entryId === id) setSession({ ...session, entryId: null })
      },
      runAll: () => {
        const next = { ...state, areas: allAreas, sensors: [] }
        const nextRequest = buildRequest(next, allAreas)
        if (nextRequest && sessionEntry && sameRequest(sessionEntry.request, nextRequest)) return
        commit(next, true)
      },
      clearSelection: () => setState((prev) => ({ ...prev, areas: allAreas, sensors: [] })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, metadata, allAreas, request, selectedKeyArea, highlightPart, hoveredVariable, focusRequest, history, session, technicianView])

  return <ConfigStoreContext.Provider value={value}>{children}</ConfigStoreContext.Provider>
}

export function useConfigStore(): ConfigStore {
  const ctx = useContext(ConfigStoreContext)
  if (!ctx) throw new Error('useConfigStore precisa estar dentro de <ConfigStoreProvider>.')
  return ctx
}
