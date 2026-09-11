import { Badge } from '@/components/ui/badge'

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

export function ReliabilityBadge({ reliability }: { reliability: ReliabilityKind }) {
  return <Badge variant="outline">{RELIABILITY_LABEL[reliability]}</Badge>
}
