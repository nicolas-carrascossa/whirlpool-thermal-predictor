import { CircleCheck, CircleX } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusKind = 'ok' | 'warn' | 'danger'

const STATUS_LABEL: Record<StatusKind, string> = {
  ok: 'Dentro do limite',
  warn: 'Atenção',
  danger: 'Excede o limite',
}

export function StatusBadge({ status }: { status: StatusKind }) {
  return <Badge variant={status}>{STATUS_LABEL[status]}</Badge>
}

export type ReliabilityKind = 'interpolation' | 'moderate_extrapolation' | 'out_of_domain'

const RELIABILITY_LABEL: Record<ReliabilityKind, string> = {
  interpolation: 'Interpolação',
  moderate_extrapolation: 'Extrapolação moderada',
  out_of_domain: 'Fora do domínio',
}

const RELIABILITY_ICON_LABEL: Record<ReliabilityKind, string> = {
  interpolation: 'Confiável — interpolação: esta combinação já foi ensaiada',
  moderate_extrapolation: 'Não confiável — extrapolação moderada: confirme os casos próximos do limite',
  out_of_domain: 'Não confiável — fora do domínio: use só para exploração, nunca para decisão',
}

/**
 * Confiabilidade em duas respostas: confiável (sim) ou não. Só a interpolação é
 * "sim"; as duas extrapolações são "não". O motivo exato fica no tooltip e no
 * rótulo acessível, para a simplificação visual não esconder a causa.
 */
export function ReliabilityIcon({ reliability }: { reliability: ReliabilityKind }) {
  const ok = reliability === 'interpolation'
  const Icon = ok ? CircleCheck : CircleX
  const label = RELIABILITY_ICON_LABEL[reliability]
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-reliable={ok ? 'true' : 'false'}
      className={cn(
        'inline-flex',
        ok ? 'text-status-ok-ink' : reliability === 'moderate_extrapolation' ? 'text-status-warn-ink' : 'text-status-danger-ink',
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </span>
  )
}

export function ReliabilityBadge({ reliability }: { reliability: ReliabilityKind }) {
  return <Badge variant="outline">{RELIABILITY_LABEL[reliability]}</Badge>
}
