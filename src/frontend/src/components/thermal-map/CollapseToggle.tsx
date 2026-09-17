/**
 * Botão de cabeçalho colapsável dos overlays sobre o mapa 3D (`MapToolbar` e
 * `ConfigSummaryOverlay`): rótulo + seta que gira 180° quando expandido.
 * Extraído para os dois usarem exatamente o mesmo mecanismo/visual.
 */

import { cn } from '@/lib/utils'

export function CollapseToggle({
  label,
  expanded,
  onClick,
}: {
  label: string
  expanded: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex w-full items-center justify-between gap-2 text-left font-body text-[11px] font-semibold text-wp-gray85 focus-visible:outline-none"
    >
      {label}
      <span
        aria-hidden="true"
        className={cn('transition-transform', expanded ? 'rotate-180' : 'rotate-0')}
      >
        ▾
      </span>
    </button>
  )
}
