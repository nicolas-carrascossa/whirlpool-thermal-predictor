/**
 * Avisos de quando a API sobe sem os modelos treinados (ver `app/model_setup.py`).
 *
 *  - `no_dataset` / `pending` / `failed` → um aviso em tela cheia que sempre abre na
 *    primeira tela (também depois de sair e entrar de novo), com três saídas:
 *      · "Tenho os CSVs": consulta a API de novo. Sem os CSVs em `data/` (`no_dataset`),
 *        diz "Ops, percebi que você não tem!", com Voltar. Com eles, mostra
 *        "Gerar os modelos", "Entrar" e "Voltar";
 *      · "Não tenho os CSVs e vou anexar": passo a passo, com Voltar;
 *      · "Sim, usar os dados mockados": a API passa ao mock e a tela recarrega os dados.
 *    "Entrar" consulta de novo: com modelos, a plataforma abre; sem eles, mostra
 *    "Ops, você ainda não tem modelos", com Voltar. Nada é gerado sem a pessoa pedir,
 *    e o motivo técnico de um `failed` (ambiente da máquina) não aparece.
 *  - `training` → avisa que os modelos estão sendo gerados e consulta de novo
 *    até terminarem; aí recarrega os dados.
 *  - `ready` / `mock` → não renderiza nada.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { DatabaseZap, FileSpreadsheet, FolderCheck, LoaderCircle, SearchX } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { enableMockMode, fetchModelStatus, generateModels, type ModelState } from '@/features/system/api'

const MODEL_STATUS_KEY = ['system', 'models'] as const
const POLL_WHILE_TRAINING_MS = 3000
// Mesmos nomes de `AREA_FILES` em `src/backend/app/model_setup.py`.
const DATASET_FILES = [
  'mainback_data.csv',
  'coil_temps_data.csv',
  'main_vent_sys_data.csv',
  'ipc_cooling_data.csv',
  'ipc_comp_data.csv',
  'ct_knobs_data.csv',
  'oven_hmi_data.csv',
] as const

function useModelStatus(enabled = true) {
  return useQuery({
    enabled,
    queryKey: MODEL_STATUS_KEY,
    queryFn: fetchModelStatus,
    retry: false,
    refetchInterval: (query) => {
      const current = query.state.data?.state
      return current === 'training' ? POLL_WHILE_TRAINING_MS : false
    },
  })
}

/**
 * Estado dos modelos para quem só precisa lê-lo (a consulta é a mesma do aviso).
 * `loading` vale enquanto a primeira resposta não chegou; com a API fora do ar,
 * a consulta falha, `loading` vira `false` e `state` fica indefinido.
 */
export function useModelState(enabled: boolean): { state: ModelState | undefined; loading: boolean } {
  const query = useModelStatus(enabled)
  return { state: query.data?.state, loading: enabled && query.isPending }
}

/** `true` enquanto o aviso dos modelos está pedindo uma decisão ou gerando-os; a tela de fundo some. */
export function useModelsGateActive(enabled: boolean): boolean {
  const { state } = useModelState(enabled)
  return enabled && (state === 'no_dataset' || state === 'pending' || state === 'failed' || state === 'training')
}

type View = 'ask' | 'steps' | 'noCsv' | 'hasCsv' | 'noModels'

export function ModelsGate() {
  const queryClient = useQueryClient()
  const titleId = useId()
  const [view, setView] = useState<View>('ask')

  const status = useModelStatus()
  const state: ModelState | undefined = status.data?.state

  // Os dados da tela (metadados, previsões, métricas) vêm do preditor: quando
  // ele muda — modelos gerados ou mock escolhido —, eles precisam ser buscados de novo.
  const reloadData = () =>
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== MODEL_STATUS_KEY[0] })

  const previous = useRef<ModelState | undefined>(undefined)
  useEffect(() => {
    if (previous.current === 'training' && state === 'ready') void reloadData()
    previous.current = state
  })

  const mock = useMutation({
    mutationFn: enableMockMode,
    onSuccess: (next) => {
      queryClient.setQueryData(MODEL_STATUS_KEY, next)
      void reloadData()
    },
  })

  // O estado pode ter mudado desde que a tela abriu (a pessoa pode ter copiado os arquivos agora).
  const checkCsvs = useMutation({
    mutationFn: async () => (await status.refetch()).data?.state,
    onSuccess: (next) => setView(next === 'no_dataset' ? 'noCsv' : 'hasCsv'),
  })

  const generate = useMutation({
    mutationFn: generateModels,
    onSuccess: (next) => queryClient.setQueryData(MODEL_STATUS_KEY, next),
  })

  const enter = useMutation({
    mutationFn: async () => (await status.refetch()).data?.state,
    onSuccess: (next) => {
      if (next === 'ready' || next === 'mock') void reloadData()
      else if (next !== 'training') setView('noModels')
    },
  })

  if (state === 'training') {
    return (
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <Card role="status" className="flex max-w-xl items-center gap-3 px-4 py-3 shadow-pop">
          <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-wp-core" aria-hidden="true" />
          <p className="text-sm text-wp-gray85">
            Gerando os modelos a partir do dataset encontrado em <code>data/</code>. Isso leva de 5 a 10 minutos; a
            tela se atualiza sozinha ao terminar.
          </p>
        </Card>
      </div>
    )
  }

  if (state !== 'no_dataset' && state !== 'pending' && state !== 'failed') return null

  const Icon =
    view === 'ask' ? DatabaseZap : view === 'steps' ? FileSpreadsheet : view === 'hasCsv' ? FolderCheck : SearchX
  const title =
    view === 'ask'
      ? 'Sem dataset. Deseja utilizar comando de dados mockados?'
      : view === 'steps'
        ? 'Como anexar o arquivo CSV bruto'
        : view === 'noCsv'
          ? 'Ops, percebi que você não tem!'
          : view === 'hasCsv'
            ? 'Encontrei os seus CSVs'
            : 'Ops, você ainda não tem modelos'
  const busy = mock.isPending || checkCsvs.isPending || generate.isPending || enter.isPending
  const backTo = (next: View) => (
    <div className="flex justify-end">
      <Button type="button" variant="secondary" onClick={() => setView(next)}>
        Voltar
      </Button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wp-gray85/40 px-4">
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto p-6 shadow-pop"
      >
        <div className="flex flex-col gap-4">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-md bg-wp-accentLt text-wp-core"
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 id={titleId} className="font-display text-lg font-extrabold text-wp-gray85">
            {title}
          </h2>

          {view === 'ask' ? (
            <>
              <p className="text-sm leading-relaxed text-wp-gray65">
                Com os dados mockados, a interface funciona com previsões sintéticas.
              </p>
              {mock.error || checkCsvs.error ? (
                <p role="alert" className="text-sm text-status-danger-ink">
                  Não foi possível concluir a ação. Tente de novo.
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button type="button" variant="secondary" onClick={() => checkCsvs.mutate()} disabled={busy}>
                  Tenho os CSVs
                </Button>
                <Button type="button" variant="secondary" onClick={() => setView('steps')} disabled={busy}>
                  Não tenho os CSVs e vou anexar os arquivos
                </Button>
                <Button type="button" onClick={() => mock.mutate()} disabled={busy}>
                  Sim, usar os dados mockados
                </Button>
              </div>
            </>
          ) : null}

          {view === 'noCsv' ? (
            <>
              <p className="text-sm leading-relaxed text-wp-gray85">
                Não encontrei os arquivos CSV da base em <code>data/</code>. Anexe-os para continuar ou use os dados
                mockados.
              </p>
              {backTo('ask')}
            </>
          ) : null}

          {view === 'hasCsv' ? (
            <>
              <p className="text-sm leading-relaxed text-wp-gray65">
                Os CSVs estão em <code>data/</code>. Gere os modelos a partir deles (leva de 5 a 10 minutos) ou
                entre na plataforma se os modelos já existem.
              </p>
              {state === 'failed' ? (
                <p role="alert" className="text-sm text-status-danger-ink">
                  Não foi possível gerar os modelos. Verifique o ambiente da API e tente de novo.
                </p>
              ) : null}
              {generate.error || enter.error ? (
                <p role="alert" className="text-sm text-status-danger-ink">
                  Não foi possível concluir a ação. Tente de novo.
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button type="button" onClick={() => generate.mutate()} disabled={busy}>
                  {state === 'failed' ? 'Tentar gerar os modelos de novo' : 'Gerar os modelos'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => enter.mutate()} disabled={busy}>
                  Entrar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setView('ask')} disabled={busy}>
                  Voltar
                </Button>
              </div>
            </>
          ) : null}

          {view === 'noModels' ? (
            <>
              <p className="text-sm leading-relaxed text-wp-gray85">
                Para usar a plataforma é preciso gerar os modelos ou usar os dados mockados.
              </p>
              {backTo('hasCsv')}
            </>
          ) : null}

          {view === 'steps' ? (
            <>
              <p className="text-sm leading-relaxed text-wp-gray65">
                Você anexa só o arquivo bruto. As {DATASET_FILES.length} planilhas por região do fogão não precisam
                ser montadas à mão: o nosso código de pré-processamento (os notebooks do repositório) divide o bruto
                nelas.
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-wp-gray85">
                <li>
                  Copie o arquivo bruto da base para <code>data/dataset_bruto.csv</code>, na raiz do repositório.
                </li>
                <li>
                  Rode, em ordem e do início ao fim, os notebooks <code>expl_preprocessamenro_hipote.ipynb</code> e{' '}
                  <code>tratamento_final_dos_dados.ipynb</code> (pasta <code>notebooks/</code>). Eles criam em{' '}
                  <code>data/</code> as {DATASET_FILES.length} planilhas:
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-wp-gray65">
                    {DATASET_FILES.map((name) => (
                      <li key={name}>
                        <code>{name}</code>
                      </li>
                    ))}
                  </ul>
                </li>
                <li>
                  Recarregue esta página (<kbd>F5</kbd>), toque em <strong>Tenho os CSVs</strong> e gere os modelos.
                  Leva de 5 a 10 minutos.
                </li>
                <li>
                  Se você já tinha escolhido os dados mockados, reinicie a API antes (<kbd>Ctrl</kbd>+<kbd>C</kbd> e{' '}
                  <code>uvicorn app.main:app --reload --port 8000</code>) e então recarregue a página.
                </li>
              </ol>
              {backTo('ask')}
            </>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
