/**
 * Tela principal do Thermal Predictor: configurar → prever → ler resultados.
 * Toda a leitura de dados passa por `PredictionSource`; nada aqui sabe se a
 * origem é o mock local ou a API da Fase 2.
 */

import { useEffect, useState } from 'react'
import { CalendarDays, ChartColumn, Globe, History, LayoutDashboard, Map, OctagonAlert, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { NavRail, type NavItem } from '@/components/layout/NavRail'
import { BrazilFlag } from '@/components/BrazilFlag'
import { UserCard } from '@/components/layout/UserCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ConfigStoreProvider, useConfigStore } from '@/features/config/store'
import { StoveConfigPanel } from '@/features/config/StoveConfigPanel'
import { StartGate } from '@/features/session/StartGate'
import { HistoryPanel } from '@/features/history/HistoryPanel'
import { useAuth } from '@/features/auth/authStore'
import { isApiMode } from '@/features/auth/RequireAuth'
import { ResultsPanel, type ResultsTab } from '@/features/results/ResultsPanel'
import {
  useMetadataQuery,
  usePredictionQuery,
} from '@/hooks/useThermalQueries'

const NAV_ITEMS: NavItem<ResultsTab>[] = [
  { id: 'resultados', label: 'Previsão', icon: LayoutDashboard },
  { id: 'mapa', label: 'Mapa térmico', icon: Map },
  { id: 'metricas', label: 'Métricas Estatísticas', icon: ChartColumn },
  { id: 'historico', label: 'Histórico', icon: History },
]

/** Chip informativo do cabeçalho (país, dia). */
function HeaderChip({ icon: Icon, children }: { icon: typeof Globe; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-md bg-wp-gray05 px-3 py-1.5 text-sm font-bold text-wp-gray85">
      <Icon className="h-4 w-4 text-wp-gray65" strokeWidth={1.75} aria-hidden="true" />
      {children}
    </span>
  )
}

const DAY_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

/** Toggle "Não técnico / Técnico" do cabeçalho: controla o nível de detalhe das tabelas de sensor. */
function ViewModeToggle({ technician, onChange }: { technician: boolean; onChange: (value: boolean) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Nível de detalhe"
      className="flex items-center gap-1 rounded-xl bg-wp-gray05 p-1 shadow-[inset_0_1px_2px_rgba(17,18,20,0.08)]"
    >
      {[
        { value: false, label: 'Não técnico' },
        { value: true, label: 'Técnico' },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={technician === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[10px] px-3 py-1.5 text-[11px] font-bold transition-colors duration-150',
            technician === option.value ? 'bg-wp-core text-white shadow-press' : 'text-wp-gray65 hover:text-wp-gray85',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function HomeContent() {
  const store = useConfigStore()
  const prediction = usePredictionQuery(store.request)
  const apiMode = isApiMode()
  const isMock = !apiMode

  // `AuthProvider` envolve toda a aplicação (ver App.tsx), então o hook é
  // sempre seguro de chamar; seus valores só importam em modo `api`.
  const auth = useAuth()
  const navigate = useNavigate()

  // Aba ativa da área de resultados; vive aqui porque o botão que abre o mapa
  // fica na barra superior (AppShell) e as abas ficam no ResultsPanel. O histórico
  // é uma dessas abas; reabrir uma consulta leva de volta a "resultados".
  const [resultsTab, setResultsTab] = useState<ResultsTab>('resultados')
  // Nó da barra lateral onde o mapa térmico põe seus filtros (via portal),
  // logo abaixo de "Configuração selecionada". Só existe na aba do mapa.
  const [mapToolbarEl, setMapToolbarEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (apiMode && auth.sessionExpired) {
      navigate('/login', { replace: true })
    }
  }, [apiMode, auth.sessionExpired, navigate])

  // O identificador da consulta é gerado pela fonte de predição. Assim que a
  // resposta atual chega, ele é associado ao snapshot salvo ao clicar em
  // "Prever"; `isPlaceholderData` evita usar a resposta da consulta anterior.
  useEffect(() => {
    if (!store.request || !prediction.data || prediction.isPlaceholderData) return
    store.recordHistoryPrediction(store.request, prediction.data)
  }, [prediction.data, prediction.isPlaceholderData, store])

  // Na tela de início (sem consulta em andamento) a previsão e o mapa ainda não aparecem.
  const showGate = store.session === null && (resultsTab === 'resultados' || resultsTab === 'mapa')
  const countryLabel =
    store.metadata?.architectures.find((a) => a.code === store.architecture)?.label_pt ?? store.architecture
  // O dia é o da última previsão; antes de qualquer uma, o de hoje.
  const day = DAY_FORMAT.format(prediction.data ? new Date(prediction.data.generated_at) : new Date())
  const sectionLabel = NAV_ITEMS.find((item) => item.id === resultsTab)?.label ?? ''
  const sessionLabel =
    store.session === null ? '' : store.session.mode === 'save' ? ` · ${store.session.name}` : ' · somente visualização'

  return (
    <AppShell
      isMock={isMock}
      title={<img src="/logoWhirlpool.png" alt="Whirlpool" className="h-20 w-auto" />}
      section={`${sectionLabel}${sessionLabel}`}
      headerRight={
        <>
          {store.architecture === 'BR' ? (
            <span className="flex items-center rounded-md bg-wp-gray05 px-3 py-2">
              <BrazilFlag label={countryLabel} className="h-[18px] w-[26px] rounded-[2px] shadow-[0_0_0_1px_rgba(17,18,20,0.12)]" />
            </span>
          ) : (
            <HeaderChip icon={Globe}>{countryLabel}</HeaderChip>
          )}
          <HeaderChip icon={CalendarDays}>{day}</HeaderChip>
          <ViewModeToggle technician={store.technicianView} onChange={store.setTechnicianView} />
          {store.session !== null && (
            <Button type="button" size="sm" onClick={store.endSession}>
              <Plus aria-hidden="true" /> Nova consulta
            </Button>
          )}
        </>
      }
      nav={<NavRail items={NAV_ITEMS} active={resultsTab} onChange={setResultsTab} />}
      configSidebar={
        <div className="flex flex-col gap-3">
          <UserCard
            name={apiMode ? (auth.user?.display_name ?? 'Usuário') : 'Usuário local'}
            role={apiMode ? (auth.user?.role ?? '') : 'Modo de demonstração'}
            onLogout={apiMode ? auth.logout : undefined}
          />
          {store.session !== null && (
            <>
              <hr className="border-wp-gray12" />
              <StoveConfigPanel onFocusVariable={() => setResultsTab('mapa')} />
              {resultsTab === 'mapa' && store.request !== null && (
                <>
                  <hr className="border-wp-gray12" />
                  <div ref={setMapToolbarEl} />
                </>
              )}
            </>
          )}
        </div>
      }
    >
      {apiMode && auth.sessionExpired && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-status-warn bg-orange-50 px-4 py-3 font-body text-sm text-wp-gray85"
        >
          Sessão expirada — entre novamente.
        </div>
      )}
      {showGate ? (
        <StartGate onStart={store.startSession} />
      ) : (
        <ResultsPanel
          metadata={store.metadata}
          response={prediction.data}
          request={store.request}
          isLoading={prediction.isFetching && !prediction.data}
          error={prediction.error}
          hasRequest={store.request !== null}
          selectedKeyArea={store.selectedKeyArea}
          onSelectKeyArea={store.selectKeyArea}
          draftConfig={store.config}
          hoveredVariable={store.hoveredVariable}
          highlightPart={store.highlightPart}
          mapToolbarContainer={mapToolbarEl}
          focusRequest={store.focusRequest}
          activeTab={resultsTab}
          onTabChange={setResultsTab}
          historySlot={<HistoryPanel onReopen={() => setResultsTab('resultados')} />}
          technicianView={store.technicianView}
          analysisBases={store.history}
        />
      )}
    </AppShell>
  )
}

export function HomePage() {
  const metadata = useMetadataQuery()

  if (metadata.error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Card>
          <CardContent
            role="alert"
            className="flex flex-col items-center gap-2 px-6 py-14 text-center"
          >
            <OctagonAlert className="h-6 w-6 text-status-danger-ink" strokeWidth={1.5} aria-hidden="true" />
            <h1 className="font-display text-lg font-semibold text-wp-gray85">
              Não foi possível carregar os metadados
            </h1>
            <p className="text-sm leading-relaxed text-wp-gray65">
              {metadata.error instanceof Error
                ? metadata.error.message
                : 'Erro desconhecido ao carregar os metadados.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <ConfigStoreProvider metadata={metadata.data}>
        <HomeContent />
      </ConfigStoreProvider>
    </TooltipProvider>
  )
}
