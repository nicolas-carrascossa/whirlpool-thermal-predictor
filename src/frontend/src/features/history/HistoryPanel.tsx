/**
 * Painel direito de consultas recentes. Cada item representa a requisição
 * enviada ao preditor, e não o formulário que pode ter sido alterado depois.
 */

import { useState } from 'react'
import { ChevronUp, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { StoveConfig } from '@/contract/v1'
import type { HistoryEntry } from '@/features/config/store'
import { useConfigStore } from '@/features/config/store'

function queriedAreas(entry: HistoryEntry, store: ReturnType<typeof useConfigStore>) {
  const { metadata } = store
  if (!metadata) return []

  const targetAreas = entry.request.targets?.key_areas
  if (targetAreas?.length) {
    return metadata.key_areas
      .filter((area) => targetAreas.includes(area.name))
      .map((area) => area.label_pt)
  }

  const targetSensors = entry.request.targets?.sensors
  if (targetSensors?.length) {
    const areaNames = new Set(
      metadata.sensors
        .filter((sensor) => targetSensors.includes(sensor.tc_number))
        .map((sensor) => sensor.key_area),
    )
    return metadata.key_areas
      .filter((area) => areaNames.has(area.name))
      .map((area) => area.label_pt)
  }

  return metadata.key_areas.map((area) => area.label_pt)
}

function formatPredictionDate(createdAt: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(createdAt))
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const store = useConfigStore()
  const [confirmed, setConfirmed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(entry.name)
  const areas = queriedAreas(entry, store)
  const detailsId = `history-details-${entry.id}`

  function saveName() {
    store.renameHistory(entry.id, draftName)
    setIsEditingName(false)
  }

  return (
    <article className="overflow-hidden rounded-md bg-wp-core text-white shadow-sm">
      {isEditingName ? (
        <form
          className="flex flex-col gap-2 px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault()
            saveName()
          }}
        >
          <input
            aria-label="Nome da consulta"
            className="w-full rounded-sm border border-white/40 bg-white px-2 py-1.5 text-sm font-semibold text-wp-gray85 caret-wp-core outline-none focus:ring-2 focus:ring-wp-accent"
            value={draftName}
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 text-white hover:bg-white/15 hover:text-white"
              onClick={() => {
                setDraftName(entry.name)
                setIsEditingName(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="relative px-4 py-3">
          <button
            type="button"
            className="absolute inset-0 rounded-sm transition-colors hover:bg-wp-core/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-wp-accent"
            onClick={() => setIsOpen(true)}
            aria-controls={detailsId}
            aria-expanded={isOpen}
            aria-label={`Abrir detalhes de ${entry.name}`}
          />
          <div className="relative z-10 flex min-w-0 items-center gap-1 pointer-events-none">
            <span className="min-w-0 flex-1 break-words font-display text-sm font-bold leading-snug">
              {entry.name}
            </span>
            {isOpen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="pointer-events-auto h-7 w-7 shrink-0 p-0 text-white hover:bg-white/15 hover:text-white"
                onClick={() => setIsEditingName(true)}
                aria-label={`Renomear ${entry.name}`}
                title="Renomear consulta"
              >
                <Pencil aria-hidden="true" />
              </Button>
            )}
          </div>
          <div className="relative z-10 mt-1 flex flex-col gap-0.5 text-[11px] font-normal text-white/75">
            <span className="break-all">Registro {entry.record ?? 'aguardando resultado'}</span>
            <time dateTime={entry.createdAt} className="leading-snug">
              {formatPredictionDate(entry.createdAt)}
            </time>
          </div>
        </div>
      )}

      {isOpen && (
        <div id={detailsId} className="border-t border-white/25 px-4 py-3">
        <div className="flex flex-col gap-3 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start px-0 text-white hover:bg-transparent hover:text-white/75"
            onClick={() => {
              setIsEditingName(false)
              setIsOpen(false)
            }}
          >
            <ChevronUp aria-hidden="true" /> Minimizar informações
          </Button>

          <section aria-label="Configuração do fogão">
            <h3 className="mb-1.5 font-body text-[11px] font-bold uppercase tracking-wide text-white/75">
              Configuração do fogão
            </h3>
            <dl className="divide-y divide-white/20 leading-snug">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 py-1.5 first:pt-0 last:pb-0">
                <dt className="text-white/75">Arquitetura</dt>
                <dd className="text-right">{entry.request.architecture}</dd>
              </div>
              {store.metadata?.variables.map((variable) => (
                <div
                  key={variable.name}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 py-1.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-white/75">{variable.label_pt}</dt>
                  <dd className="text-right">
                    {entry.request.config[variable.name as keyof StoveConfig]}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Áreas consultadas">
            <h3 className="mb-1.5 font-body text-[11px] font-bold uppercase tracking-wide text-white/75">
              Áreas consultadas
            </h3>
            <ul className="flex flex-col gap-1">
              {areas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-2 border-t border-white/25 pt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => store.restoreHistory(entry)}>
              Reabrir consulta
            </Button>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-white/90">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[color:var(--status-danger)]"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Confirmo que desejo apagar esta consulta.
            </label>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2 w-full"
              disabled={!confirmed}
              onClick={() => store.deleteHistory(entry.id)}
            >
              <Trash2 aria-hidden="true" /> Excluir consulta
            </Button>
          </div>
        </div>
        </div>
      )}
    </article>
  )
}

export function HistoryPanel() {
  const store = useConfigStore()

  return (
    <section className="flex flex-col gap-4" aria-label="Histórico de consultas">
      <div>
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">
          Histórico
        </h2>
        <p className="mt-1 text-xs text-wp-gray65">Consultas salvas nesta sessão.</p>
      </div>

      {store.history.length === 0 ? (
        <p className="rounded-md border border-dashed border-wp-gray20 px-3 py-4 text-xs leading-relaxed text-wp-gray65">
          As consultas aparecerão aqui quando você clicar em Prever.
        </p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="Consultas salvas">
          {store.history.map((entry) => (
            <li key={entry.id}>
              <HistoryCard entry={entry} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
