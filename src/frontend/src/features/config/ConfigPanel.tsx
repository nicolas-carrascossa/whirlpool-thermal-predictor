/**
 * Painel esquerdo: as 7 variáveis do dataset, o recorte de áreas/sensores e as
 * ações da consulta. Tudo é gerado a partir do `getMetadata()` — nenhuma opção
 * é digitada aqui, para que a Fase 2 (API) não exija mudança de tela.
 */

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

import { HelpTooltip } from '@/components/HelpTooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StoveConfig } from '@/contract/v1'
import { useConfigStore } from '@/features/config/store'
import { formatCount } from '@/lib/format'

function FieldLabel({
  htmlFor,
  label,
  help,
  usedByModel,
  onHoverChange,
}: {
  htmlFor: string
  label: string
  help: string
  usedByModel: boolean
  /** Dispara ao passar o mouse/focar a área do rótulo e da ajuda (não o select). */
  onHoverChange: (hovered: boolean) => void
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
    >
      <label
        htmlFor={htmlFor}
        className="font-body text-xs font-semibold uppercase tracking-wide text-wp-gray65"
      >
        {label}
      </label>
      <HelpTooltip label={label} text={help} />
      {!usedByModel && (
        <Badge variant="outline" className="border-dashed px-2 py-0 text-[10px] font-normal">
          informativo — não usado pelo modelo
        </Badge>
      )}
    </div>
  )
}

function PanelSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-wp-gray12 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ConfigPanel() {
  const store = useConfigStore()
  const { metadata, config } = store
  const [sensorSearch, setSensorSearch] = useState('')

  const sensorsInScope = useMemo(() => {
    if (!metadata) return []
    const areaFiltered =
      store.areas.length > 0
        ? metadata.sensors.filter((s) => store.areas.includes(s.key_area))
        : metadata.sensors
    const q = sensorSearch.trim().toLowerCase()
    if (!q) return areaFiltered
    return areaFiltered.filter((s) => s.tc_name.toLowerCase().includes(q))
  }, [metadata, store.areas, sensorSearch])

  if (!metadata || !config) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-wp-gray05" />
        ))}
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        store.submit()
      }}
    >
      <PanelSection title="Configuração do fogão">
        <div className="flex flex-col gap-4">
          {metadata.variables.map((variable) => {
            const id = `var-${variable.name}`
            const field = variable.name as keyof StoveConfig
            const value = config[field] ?? ''
            return (
              <div key={variable.name} className="flex flex-col gap-1.5">
                <FieldLabel
                  htmlFor={id}
                  label={variable.label_pt}
                  help={variable.help_pt}
                  usedByModel={variable.used_by_model}
                  onHoverChange={(hovered) => store.setHoveredVariable(hovered ? field : null)}
                />
                <Select
                  value={value}
                  onValueChange={(next) =>
                    store.setField(variable.name as keyof StoveConfig, next)
                  }
                >
                  <SelectTrigger
                    id={id}
                    aria-label={variable.label_pt}
                    className={variable.used_by_model ? undefined : 'text-wp-gray65'}
                  >
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {variable.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </PanelSection>

      <PanelSection
        title="Áreas"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={store.setAllAreas}
            disabled={store.areas.length === 0}
          >
            Todas
          </Button>
        }
      >
        <p className="text-xs text-wp-gray65">
          {store.areas.length === 0
            ? 'Todas as áreas (padrão)'
            : `${formatCount(store.areas.length)} de ${formatCount(metadata.key_areas.length)} áreas`}
        </p>
        <ul className="flex flex-col gap-1">
          {metadata.key_areas.map((area) => {
            const checked = store.areas.length === 0 || store.areas.includes(area.name)
            return (
              <li key={area.name}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-wp-gray85 transition-colors hover:bg-wp-accentLt">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[color:var(--wp-core)]"
                    checked={checked}
                    onChange={() => store.toggleArea(area.name)}
                  />
                  <span className="flex-1 leading-snug">{area.label_pt}</span>
                  <span className="tabular text-xs text-wp-gray45">{area.n_sensors}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </PanelSection>

      <PanelSection
        title="Sensores"
        action={
          store.sensors.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={store.clearSensors}>
              <X aria-hidden="true" /> Limpar
            </Button>
          ) : undefined
        }
      >
        <p className="text-xs text-wp-gray65">
          {store.sensors.length === 0
            ? 'Todos os sensores das áreas escolhidas (padrão)'
            : `${formatCount(store.sensors.length)} sensor(es) escolhido(s)`}
        </p>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-wp-gray45"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Input
            type="search"
            value={sensorSearch}
            aria-label="Buscar sensor pelo nome"
            placeholder="Buscar sensor…"
            className="pl-8"
            onChange={(event) => setSensorSearch(event.target.value)}
          />
        </div>
        <ul className="rounded-md border border-wp-gray12">
          {sensorsInScope.length === 0 ? (
            <li className="px-2 py-3 text-xs text-wp-gray65">Nenhum sensor encontrado.</li>
          ) : (
            sensorsInScope.map((sensor) => (
              <li key={sensor.tc_number}>
                <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-wp-gray85 transition-colors hover:bg-wp-accentLt">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[color:var(--wp-core)]"
                    checked={store.sensors.includes(sensor.tc_number)}
                    onChange={() => store.toggleSensor(sensor.tc_number)}
                  />
                  <span className="tabular text-wp-gray45">
                    {String(sensor.tc_number).padStart(2, '0')}
                  </span>
                  <span className="flex-1 leading-snug">{sensor.tc_name}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      </PanelSection>

      {/* Abaixo de 1024 px o painel não é um contêiner de rolagem próprio, então
          a barra de ações só gruda no modo de duas colunas. */}
      <div className="flex flex-col gap-2 border-t border-wp-gray12 bg-white pb-1 pt-4 lg:sticky lg:bottom-0">
        <Button type="submit">
          Prever{store.isDirty ? ' — configuração alterada' : ''}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={store.resetToReference}
          >
            Configuração de referência
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={store.clearSelection}>
            Limpar seleção
          </Button>
        </div>
      </div>
    </form>
  )
}
