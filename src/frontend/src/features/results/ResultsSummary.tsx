/**
 * Cabeçalho dos resultados: números que respondem "posso seguir com esta
 * configuração?" antes de qualquer tabela, mais o aviso de confiabilidade.
 */

import { Activity, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'

import type { PredictionResponse, Reliability } from '@/contract/v1'
import { formatCount } from '@/lib/format'
import { statusOf } from '@/lib/status'
import { cn } from '@/lib/utils'

const APPROVAL_COPY: Record<Reliability, { label: string; className: string; reason: string }> = {
  interpolation: {
    label: 'Alta',
    className: 'text-status-ok-ink',
    reason: 'a combinação de variáveis consultada já foi ensaiada no conjunto de treino',
  },
  moderate_extrapolation: {
    label: 'Média',
    className: 'text-status-warn-ink',
    reason: 'uma variável da configuração está em uma combinação que não foi ensaiada',
  },
  out_of_domain: {
    label: 'Baixa',
    className: 'text-status-danger-ink',
    reason: 'duas ou mais variáveis estão fora das combinações presentes no conjunto de treino',
  },
}

/** Um indicador por coluna (divididas por linhas): o número que responde a uma pergunta só. */
function Stat({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'warn' | 'danger'
  icon: LucideIcon
}) {
  const color =
    tone === 'danger'
      ? 'text-status-danger-ink'
      : tone === 'warn'
        ? 'text-status-warn-ink'
        : 'text-wp-gray85'
  return (
    <div className="relative flex min-w-0 flex-col gap-1.5 px-5 first:pl-0 last:pr-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-wp-gray65">{label}</span>
        <span
          aria-hidden="true"
          className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', color)}
          style={{ backgroundColor: 'color-mix(in srgb, currentColor 12%, white)' }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>
      <span className={cn('tabular text-3xl font-extrabold leading-none', color)}>{value}</span>
      {hint && <span className="line-clamp-2 text-xs leading-snug text-wp-gray65">{hint}</span>}
    </div>
  )
}

export function ResultsSummary({ response }: { response: PredictionResponse }) {
  const preds = response.predictions
  const exceeding = preds.filter((p) => statusOf(p) === 'danger')
  const warning = preds.filter((p) => statusOf(p) === 'warn')
  const reliability = preds[0]?.reliability ?? 'interpolation'
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 divide-y divide-wp-gray12 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Sensores previstos" value={formatCount(preds.length)} icon={Activity} />
        <Stat
          label="Excedem o limite"
          icon={OctagonAlert}
          value={formatCount(exceeding.length)}
          tone={exceeding.length > 0 ? 'danger' : undefined}
          hint={exceeding.length > 0 ? 'exigem revisão de projeto' : 'nenhum acima do limite'}
        />
        <Stat
          label="Em atenção (≥ 90 %)"
          icon={TriangleAlert}
          value={formatCount(warning.length)}
          tone={warning.length > 0 ? 'warn' : undefined}
          hint="entre 90 % e 100 % do limite"
        />
      </div>
    </div>
  )
}

export function ReliabilityApproval({ response }: { response: PredictionResponse }) {
  const reliability = response.predictions[0]?.reliability ?? 'interpolation'
  const approval = APPROVAL_COPY[reliability]

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-wp-gray65">Aprovação</span>
        <span className={cn('font-bold', approval.className)}>{approval.label}</span>
      </div>
      <p className="text-xs leading-relaxed text-wp-gray65">
        Esta previsão recebeu aprovação {approval.label.toLowerCase()} porque {approval.reason}. Em geral, a
        aprovação indica o quanto a previsão está apoiada pelos cenários de treino. Isso mede a confiabilidade da
        previsão, não garante que a temperatura esteja dentro do limite.
      </p>
    </div>
  )
}
