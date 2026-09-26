/**
 * Mini-resumo da configuração (rascunho) no canto superior direito do canvas
 * (Fase 1d, etapa D). Mostra as 6 variáveis com peça (`losses` fica de fora,
 * como na legenda peça↔variável) e destaca a que está em foco no momento
 * (hover no select ou peça pulsando).
 */

import { useState } from 'react'

import type { StoveConfig } from '@/contract/v1'
import { cn } from '@/lib/utils'

import { CollapseToggle } from './CollapseToggle'
import { PART_TO_VARIABLE, VARIABLE_TO_PART, type PartId } from './parts'

/** Rótulos curtos — o resumo é compacto, os nomes completos ficam na legenda. */
const SUMMARY_LABEL_PT: Partial<Record<keyof StoveConfig, string>> = {
  blower_direction: 'Blower',
  housing: 'Carcaça',
  board_position: 'Placa',
  deflector_hole: 'Defletor',
  material_coil_support: 'Resistência',
  run_case: 'Cooktop/Forno',
}

const SUMMARY_FIELDS = (Object.keys(SUMMARY_LABEL_PT) as (keyof StoveConfig)[]).filter(
  (field) => VARIABLE_TO_PART[field] !== null,
)

export function ConfigSummaryOverlay({
  config,
  highlightPart,
}: {
  config: StoveConfig
  highlightPart?: PartId | null
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="absolute right-3 top-3 z-10 max-w-[12rem] rounded-md border border-wp-gray12 bg-white/90 px-2 py-1 font-body text-[11px] leading-tight text-wp-gray65 shadow-sm backdrop-blur"
      aria-label="Resumo da configuração"
    >
      <CollapseToggle
        label="Configuração"
        expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      />
      {expanded && (
        <ul className="mt-1 flex flex-col">
          {SUMMARY_FIELDS.map((field) => {
            const part = VARIABLE_TO_PART[field]
            const isActive = part !== null && highlightPart === part && PART_TO_VARIABLE[part] === field
            return (
              <li
                key={field}
                className={cn('truncate leading-[1.35]', isActive && 'font-bold text-wp-core')}
                title={`${SUMMARY_LABEL_PT[field]}: ${config[field]}`}
              >
                {SUMMARY_LABEL_PT[field]}: {config[field]}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
