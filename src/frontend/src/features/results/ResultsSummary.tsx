/**
 * Cabeçalho dos resultados: números que respondem "posso seguir com esta
 * configuração?" antes de qualquer tabela, mais o aviso de confiabilidade.
 */

import {
  Activity,
  BadgeCheck,
  OctagonAlert,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

import type { PredictionResponse, Reliability } from '@/contract/v1'
import { formatCount } from '@/lib/format'
import { statusOf } from '@/lib/status'
import { cn } from '@/lib/utils'

const APPROVAL_COPY: Record<
  Reliability,
  {
    label: string
    detail: string
    approved: boolean
  }
> = {
  interpolation: {
    label: 'Aprovado',
    approved: true,
    detail:
      'Esta combinação já foi testada nos cenários de treino, por isso a previsão tem alta confiabilidade.',
  },
  moderate_extrapolation: {
    label: 'Não aprovado',
    approved: false,
    detail:
      'Uma variável está em uma combinação ainda não testada. Revise a configuração antes de tomar uma decisão.',
  },
  out_of_domain: {
    label: 'Não aprovado',
    approved: false,
    detail:
      'Duas ou mais variáveis estão fora dos cenários de treino. Esta previsão precisa de validação técnica.',
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
  const ApprovalIcon = approval.approved ? BadgeCheck : ShieldAlert

  return (
    <div>
      <section
        aria-labelledby="reliability-approval-title"
        className="overflow-hidden rounded-2xl bg-wp-core text-white shadow-raised"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
              Confiabilidade da previsão
            </p>
            <h3
              id="reliability-approval-title"
              className="mt-1 font-display text-xl font-extrabold leading-tight text-white"
            >
              {approval.label}
            </h3>
          </div>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              approval.approved
                ? 'border-status-ok/40 bg-status-ok/15 text-status-ok'
                : 'border-status-danger/40 bg-status-danger/15 text-status-danger',
            )}
          >
            <ApprovalIcon className="h-6 w-6" strokeWidth={2} />
          </span>
        </div>

        <div className="px-5 py-4">
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">{approval.detail}</p>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-white/55">
            <span aria-hidden="true" className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-white/40" />
            A aprovação mede o apoio dos dados de treino, não se a temperatura está dentro do limite.
          </p>
        </div>
      </section>
    </div>
  )
}
