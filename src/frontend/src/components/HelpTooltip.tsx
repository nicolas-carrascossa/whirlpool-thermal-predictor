import { CircleHelp } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Ícone de ajuda (linha, sem preenchimento — exigência do style guide) que
 * abre o texto explicativo da variável. Abre no hover e no foco por teclado.
 */
export function HelpTooltip({ label, text }: { label: string; text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Ajuda sobre ${label}`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-wp-gray45 transition-colors hover:text-wp-gray85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleHelp className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm whitespace-pre-line leading-relaxed">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
