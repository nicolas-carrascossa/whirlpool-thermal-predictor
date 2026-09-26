/**
 * Painel esquerdo: as 7 variáveis do dataset, o recorte de áreas/sensores e as
 * ações da consulta. Tudo é gerado a partir do `getMetadata()` — nenhuma opção
 * é digitada aqui, para que a Fase 2 (API) não exija mudança de tela.
 */

import { useId, useMemo, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { StoveConfig } from '@/contract/v1'
import { useConfigStore } from '@/features/config/store'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'

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

/**
 * Seção recolhível do painel. O cabeçalho é um disclosure: o título é um
 * `<button>` dentro do `<h2>` (o heading continua existindo com o mesmo texto),
 * com `aria-expanded`/`aria-controls`. `action` fica como irmã do gatilho — não
 * dentro dele, que seria HTML inválido — então um clique nela nunca chega ao
 * toggle. O conteúdo permanece montado e recebe `hidden` quando recolhido, para
 * preservar estado interno (busca, rolagem) e manter o `aria-controls` válido.
 */
function PanelSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  const contentId = useId()
  return (
    <section className="flex flex-col gap-3 border-t border-wp-gray12 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">
          {/* O preflight zera `text-transform` e `letter-spacing` em <button>, por
              isso a tipografia do título é repetida aqui em vez de só herdada. */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-1.5 rounded-sm text-left font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {title}
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </h2>
        {action}
      </div>
      {/* `flex` só quando aberto: a classe de display tem a mesma especificidade
          do `[hidden]` do preflight e, por vir depois, o anularia. */}
      <div id={contentId} hidden={!open} className={cn('flex-col gap-3', open && 'flex')}>
        {children}
      </div>
    </section>
  )
}

export function ConfigPanel() {
  const store = useConfigStore()
  const { metadata, config } = store
  const [sensorSearch, setSensorSearch] = useState('')

  const selectedAreas = useMemo(() => {
    if (!metadata) return []
    return metadata.key_areas.filter((area) => store.areas.includes(area.name))
  }, [metadata, store.areas])

  const sensorsBySelectedArea = useMemo(() => {
    if (!metadata) return []
    const q = sensorSearch.trim().toLowerCase()
    return selectedAreas.map((area) => ({
      area,
      sensors: metadata.sensors.filter(
        (sensor) =>
          sensor.key_area === area.name && (!q || sensor.tc_name.toLowerCase().includes(q)),
      ),
    }))
  }, [metadata, selectedAreas, sensorSearch])

  /** Sensores visíveis na lista (áreas selecionadas + filtro de busca aplicado). */
  const listedSensorNumbers = useMemo(
    () => sensorsBySelectedArea.flatMap(({ sensors }) => sensors.map((s) => s.tc_number)),
    [sensorsBySelectedArea],
  )

  const totalAreas = metadata?.key_areas.length ?? 0
  const noAreaSelected = store.areas.length === 0
  const allAreasSelected = totalAreas > 0 && store.areas.length === totalAreas

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
      <PanelSection
        title="Áreas"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={store.setAllAreas}
            disabled={allAreasSelected}
          >
            Selecionar todas
          </Button>
        }
      >
        <p className="text-xs text-wp-gray65">
          {noAreaSelected
            ? 'Nenhuma área selecionada'
            : allAreasSelected
              ? 'Todas as áreas'
              : `${formatCount(store.areas.length)} de ${formatCount(totalAreas)} áreas`}
        </p>
        <ul className="flex flex-col gap-1">
          {metadata.key_areas.map((area) => {
            const checked = store.areas.includes(area.name)
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
        title="Sensores das áreas selecionadas"
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
            ? 'Todos os sensores das áreas selecionadas (padrão)'
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
        <ul className="max-h-56 overflow-y-auto rounded-md border border-wp-gray12">
          {sensorsBySelectedArea.length === 0 ? (
            <li className="px-2 py-3 text-xs text-wp-gray65">Nenhuma área selecionada.</li>
          ) : (
            sensorsBySelectedArea.map(({ area, sensors }) => (
              <li key={area.name} className="border-b border-wp-gray12 last:border-b-0">
                <h3 className="px-2 py-2 font-body text-xs font-semibold text-wp-core">
                  {area.label_pt}
                </h3>
                {sensors.length === 0 ? (
                  <p className="px-2 pb-2 text-xs text-wp-gray65">Nenhum sensor encontrado.</p>
                ) : (
                  <ul>
                    {sensors.map((sensor) => (
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
                    ))}
                  </ul>
                )}
              </li>
            ))
          )}
        </ul>
        {/* Age sobre o que está listado: áreas selecionadas já com o filtro de busca. */}
        <div className="border-t border-wp-gray12 pt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => store.setAllSensors(listedSensorNumbers)}
            disabled={listedSensorNumbers.length === 0}
          >
            Selecionar todos os sensores
          </Button>
        </div>
      </PanelSection>

      <PanelSection title="Configurações do fogão">
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

      {/* Abaixo de 1024 px o painel não é um contêiner de rolagem próprio, então
          a barra de ações só gruda no modo de duas colunas. */}
      <div className="flex flex-col gap-2 border-t border-wp-gray12 bg-white pb-1 pt-4 lg:sticky lg:bottom-0">
        <Button type="submit" disabled={noAreaSelected || store.hasDuplicateHistory}>
          {store.hasDuplicateHistory
            ? 'Previsão já salva no histórico'
            : 'Prever'}
        </Button>
        {noAreaSelected && (
          <p role="status" className="text-xs text-wp-gray65">
            Selecione ao menos uma área para prever.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={store.runAll}
              >
                Run All
              </Button>
            </TooltipTrigger>
            <TooltipContent>Roda todas as áreas do fogão com a configuração selecionada.</TooltipContent>
          </Tooltip>
          <Button type="button" variant="outline" size="sm" onClick={store.clearSelection}>
            Limpar seleção
          </Button>
        </div>
      </div>
    </form>
  )
}
