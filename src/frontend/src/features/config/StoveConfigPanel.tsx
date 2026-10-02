/**
 * Painel direito: as 7 variáveis do fogão e as ações da consulta.
 *
 * Cada variável é um cartão com ícone próprio e as opções lado a lado, em vez
 * de um dropdown: o engenheiro vê todas as escolhas de uma vez e troca com um
 * clique. O conjunto é gerado a partir de `metadata.variables` — nenhuma opção
 * é digitada aqui.
 */

import { useId, type KeyboardEvent } from 'react'
import { BrazilFlag } from '@/components/BrazilFlag'
import { HelpTooltip } from '@/components/HelpTooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { HIDDEN_OPTIONS, VARIABLE_LABEL_EN } from '@/features/config/variableLabels'
import { cn } from '@/lib/utils'

/** Até 3 opções cabem numa linha; acima disso vira grade de 2 colunas. */
const MAX_OPTIONS_PER_ROW = 3
const LONG_OPTION_CHARS = 18
/** Acima disso a grade vira um paredão de botões: volta o dropdown. */
const MAX_SEGMENTED_OPTIONS = 8

function SegmentedOptions({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (next: string) => void
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (step === 0) return
    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next)
    // O foco acompanha a seleção, como em qualquer radiogroup.
    const group = event.currentTarget.parentElement
    requestAnimationFrame(() => {
      group?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    })
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'gap-1 rounded-xl bg-wp-gray05 p-1 shadow-[inset_0_1px_3px_rgba(17,18,20,0.08)]',
        // Nomes longos (ex.: opções de losses) não cabem em duas colunas: um botão por linha.
        options.some((o) => o.length > LONG_OPTION_CHARS)
          ? 'grid grid-cols-1'
          : options.length <= MAX_OPTIONS_PER_ROW
            ? 'flex'
            : 'grid grid-cols-2',
      )}
    >
      {options.map((option, index) => {
        const checked = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (!options.includes(value) && index === 0) ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'min-w-0 flex-1 break-words rounded-[10px] px-1.5 py-1.5 text-center font-body text-[11px] font-semibold leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              checked
                ? 'bg-wp-core text-white shadow-press'
                : 'text-wp-gray65 hover:bg-white hover:text-wp-core',
            )}
          >
            {option.replace(/\s+/g, ' ')}
          </button>
        )
      })}
    </div>
  )
}

/** Resumo somente leitura da configuração já prevista. */
function ConfigSummary() {
  const store = useConfigStore()
  const { metadata, config } = store
  if (!metadata || !config) return null
  const architectureLabel =
    metadata.architectures.find((a) => a.code === store.architecture)?.label_pt ?? store.architecture

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core">
          Configuração selecionada
        </h2>
        <Badge variant="outline" className="whitespace-nowrap uppercase">
          {store.architecture === 'BR' ? <BrazilFlag label={architectureLabel} /> : architectureLabel}
        </Badge>
      </div>
      <div className="flex flex-col">
        {metadata.variables.map((variable) => {
          const field = variable.name as keyof StoveConfig
          const value = config[field] ?? ''
          const label = VARIABLE_LABEL_EN[field] ?? variable.label_pt
          return (
            <div
              key={variable.name}
              className="flex items-center justify-between gap-2 border-b border-wp-gray12 py-3 first:pt-0 last:border-b-0"
            >
              <span className="font-body text-xs font-semibold uppercase tracking-wide text-wp-gray65">
                {label}
              </span>
              <span className="text-right text-xs font-semibold text-wp-gray85">{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function StoveConfigPanel() {
  const store = useConfigStore()
  const { metadata, config } = store
  const headingId = useId()

  if (!metadata || !config) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-wp-gray05" />
        ))}
      </div>
    )
  }

  if (store.request !== null) {
    return <ConfigSummary />
  }

  const noAreaSelected = store.areas.length === 0
  const architectureLabel =
    metadata.architectures.find((a) => a.code === store.architecture)?.label_pt ?? store.architecture

  return (
    <form
      className="flex flex-col gap-4"
      aria-labelledby={headingId}
      onSubmit={(event) => {
        event.preventDefault()
        store.submit()
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className="font-display text-sm font-bold uppercase tracking-[0.05em] text-wp-core"
        >
          Stove configuration
        </h2>
        <Badge variant="outline" className="whitespace-nowrap uppercase">
          {store.architecture === 'BR' ? <BrazilFlag label={architectureLabel} /> : architectureLabel}
        </Badge>
      </div>

      <div className="flex flex-col">
        {metadata.variables.map((variable) => {
          const field = variable.name as keyof StoveConfig
          const value = config[field] ?? ''
          const label = VARIABLE_LABEL_EN[field] ?? variable.label_pt
          const options = variable.options.filter((o) => !HIDDEN_OPTIONS[field]?.includes(o))
          const reference = metadata.reference_config?.[field]
          const changed = reference !== undefined && reference !== value
          return (
            <div
              key={variable.name}
              className={cn(
                // Sem cartões sobrepostos: cada variável é só uma faixa separada por linha.
                'flex flex-col gap-2 border-b border-wp-gray12 py-4 first:pt-0 last:border-b-0',
              )}
              onMouseEnter={() => store.setHoveredVariable(field)}
              onMouseLeave={() => store.setHoveredVariable(null)}
              onFocus={() => store.setHoveredVariable(field)}
              onBlur={() => store.setHoveredVariable(null)}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 font-body text-xs font-semibold uppercase tracking-wide text-wp-gray65">
                  {label}
                </span>
                {changed && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-wp-accent"
                    title={`Diferente da referência (${reference})`}
                    role="img"
                    aria-label={`Diferente da referência (${reference})`}
                  />
                )}
                <HelpTooltip label={label} text={variable.help_pt} />
              </div>
              {!variable.used_by_model && (
                <Badge variant="outline" className="self-start border-dashed px-2 py-0 text-[10px] font-normal">
                  informative — not used by the model
                </Badge>
              )}
              {options.length > MAX_SEGMENTED_OPTIONS ? (
                <Select value={value} onValueChange={(next) => store.setField(field, next)}>
                  <SelectTrigger aria-label={label} className="h-9 text-xs">
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <SegmentedOptions
                  label={label}
                  options={options}
                  value={value}
                  onChange={(next) => store.setField(field, next)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Abaixo de 1024 px o painel não é um contêiner de rolagem próprio, então
          a barra de ações só gruda no modo de duas colunas. */}
      <div className="flex flex-col gap-2 border-t border-wp-gray12 bg-white pb-1 pt-4 lg:sticky lg:bottom-0">
        <Button type="submit" disabled={noAreaSelected || store.hasDuplicateHistory}>
          {store.hasDuplicateHistory ? 'Previsão já salva no histórico' : 'Prever'}
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
