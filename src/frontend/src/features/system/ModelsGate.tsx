/**
 * Avisos de quando a API sobe sem os modelos treinados (ver `app/model_setup.py`).
 *
 *  - `no_dataset` → pergunta se a pessoa quer usar os dados mockados.
 *    Sim → a API passa ao mock e a tela recarrega os dados; Não → nada acontece.
 *  - `training` → avisa que os modelos estão sendo gerados e consulta de novo
 *    até terminarem; aí recarrega os dados.
 *  - `failed` → mostra o motivo e oferece os dados mockados, como no `no_dataset`.
 *    Continua consultando: depois de um `pip install`, a geração começa sozinha.
 *  - `ready` / `mock` → não renderiza nada.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { DatabaseZap, LoaderCircle, OctagonAlert } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { enableMockMode, fetchModelStatus, type ModelState } from '@/features/system/api'

const MODEL_STATUS_KEY = ['system', 'models'] as const
const POLL_WHILE_TRAINING_MS = 3000
const POLL_WHILE_FAILED_MS = 5000
const FAILED_PREFIX = 'Não foi possível gerar os modelos: '

export function ModelsGate() {
  const queryClient = useQueryClient()
  const titleId = useId()
  const [dismissed, setDismissed] = useState(false)

  const status = useQuery({
    queryKey: MODEL_STATUS_KEY,
    queryFn: fetchModelStatus,
    retry: false,
    refetchInterval: (query) => {
      const current = query.state.data?.state
      if (current === 'training') return POLL_WHILE_TRAINING_MS
      if (current === 'failed') return POLL_WHILE_FAILED_MS
      return false
    },
  })
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

  if (state === 'training') {
    return (
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <Card role="status" className="flex max-w-xl items-center gap-3 px-4 py-3 shadow-pop">
          <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-wp-core" aria-hidden="true" />
          <p className="text-sm text-wp-gray85">
            Gerando os modelos a partir do dataset encontrado em <code>data/</code>. Isso leva cerca de 1 minuto; a
            tela se atualiza sozinha ao terminar.
          </p>
        </Card>
      </div>
    )
  }

  if ((state !== 'no_dataset' && state !== 'failed') || dismissed) return null
  const failed = state === 'failed'
  const Icon = failed ? OctagonAlert : DatabaseZap

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-wp-gray85/40 px-4">
      <Card role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md p-6 shadow-pop">
        <div className="flex flex-col gap-4">
          <span
            aria-hidden="true"
            className={
              failed
                ? 'flex h-10 w-10 items-center justify-center rounded-md bg-status-danger/15 text-status-danger-ink'
                : 'flex h-10 w-10 items-center justify-center rounded-md bg-wp-accentLt text-wp-core'
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h2 id={titleId} className="font-display text-lg font-extrabold text-wp-gray85">
            {failed
              ? 'Não foi possível gerar os modelos. Deseja utilizar comando de dados mockados?'
              : 'Sem dataset. Deseja utilizar comando de dados mockados?'}
          </h2>
          {failed ? (
            <p role="alert" className="text-sm leading-relaxed text-wp-gray85">
              {status.data?.message.replace(FAILED_PREFIX, '')}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-wp-gray65">
              Não há modelos treinados nem as planilhas da base em <code>data/</code>.
            </p>
          )}
          <p className="text-sm leading-relaxed text-wp-gray65">
            Com os dados mockados, a interface funciona com previsões sintéticas.
          </p>
          {mock.error ? (
            <p role="alert" className="text-sm text-status-danger-ink">
              {mock.error instanceof Error ? mock.error.message : 'Não foi possível ativar os dados mockados.'}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDismissed(true)} disabled={mock.isPending}>
              Não
            </Button>
            <Button type="button" onClick={() => mock.mutate()} disabled={mock.isPending}>
              Sim
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
