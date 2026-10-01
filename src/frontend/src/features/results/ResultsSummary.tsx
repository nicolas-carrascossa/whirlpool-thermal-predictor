/**
 * Cabeçalho dos resultados: números que respondem "posso seguir com esta
 * configuração?" antes de qualquer tabela, mais o aviso de confiabilidade.
 */

import { AlertTriangle, Info, OctagonAlert } from 'lucide-react'

import { Card } from '@/components/ui/card'
import type { PredictionResponse, Reliability } from '@/contract/v1'
import { formatCount, formatRatioPct } from '@/lib/format'
import { ratioOf, statusOf } from '@/lib/status'
import { cn } from '@/lib/utils'

const RELIABILITY_COPY: Record<
  Reliability,
  { title: string; text: string; tone: 'neutral' | 'warn' | 'danger' }
> = {
  interpolation: {
    title: 'Interpolação',
    text: 'Esta combinação de variáveis existe no conjunto de ensaios. É o cenário em que a estimativa é mais confiável.',
    tone: 'neutral',
  },
  moderate_extrapolation: {
    title: 'Extrapolação moderada',
    text: 'Uma variável desta configuração não aparece assim em nenhum ensaio. O modelo está estendendo o que aprendeu: trate os valores como indicativos e confirme os casos próximos do limite.',
    tone: 'warn',
  },
  out_of_domain: {
    title: 'Fora do domínio',
    text: 'Duas ou mais variáveis fogem das combinações ensaiadas. Não há evidência experimental que sustente estes números — use apenas para exploração, nunca para decisão de projeto.',
    tone: 'danger',
  },
}

const TONE_STYLE = {
  neutral: 'border-wp-gray12 bg-wp-gray05 text-wp-gray85',
  warn: 'border-status-warn bg-status-warn/10 text-wp-gray85',
  danger: 'border-status-danger bg-status-danger/10 text-wp-gray85',
} as const

const TONE_ICON = {
  neutral: Info,
  warn: AlertTriangle,
  danger: OctagonAlert,
} as const

/** Filete no topo do cartão: a cor já antecipa o status antes de ler o número. */
const STAT_ACCENT = {
  ok: 'bg-wp-core',
  warn: 'bg-status-warn',
  danger: 'bg-status-danger',
} as const

/** Um indicador por cartão: o número que responde a uma pergunta só. */
function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'warn' | 'danger'
}) {
  const color =
    tone === 'danger'
      ? 'text-status-danger'
      : tone === 'warn'
        ? 'text-status-warn'
        : 'text-wp-core'
  return (
    <Card className="relative flex min-w-0 flex-col gap-1.5 overflow-hidden p-4">
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-0 top-0 h-1', tone ? STAT_ACCENT[tone] : 'bg-wp-gray12')}
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-wp-gray65">{label}</span>
      <span className={cn('tabular text-3xl leading-none', color)}>{value}</span>
      {hint && <span className="line-clamp-2 text-xs leading-snug text-wp-gray65">{hint}</span>}
    </Card>
  )
}

export function ResultsSummary({ response }: { response: PredictionResponse }) {
  const preds = response.predictions
  const exceeding = preds.filter((p) => statusOf(p) === 'danger')
  const warning = preds.filter((p) => statusOf(p) === 'warn')
  const worst = preds
    .filter((p) => ratioOf(p) !== null)
    .reduce<(typeof preds)[number] | null>(
      (acc, p) => (acc === null || (ratioOf(p) ?? 0) > (ratioOf(acc) ?? 0) ? p : acc),
      null,
    )
  const worstRatio = worst ? ratioOf(worst) : null

  const reliability = preds[0]?.reliability ?? 'interpolation'
  const copy = RELIABILITY_COPY[reliability]
  const ToneIcon = TONE_ICON[copy.tone]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Sensores previstos" value={formatCount(preds.length)} />
        <Stat
          label="Excedem o limite"
          value={formatCount(exceeding.length)}
          tone={exceeding.length > 0 ? 'danger' : undefined}
          hint={exceeding.length > 0 ? 'exigem revisão de projeto' : 'nenhum acima do limite'}
        />
        <Stat
          label="Em atenção (≥ 90 %)"
          value={formatCount(warning.length)}
          tone={warning.length > 0 ? 'warn' : undefined}
          hint="entre 90 % e 100 % do limite"
        />
        <Stat
          label="Pior razão temp/limite"
          value={formatRatioPct(worstRatio)}
          tone={
            worst && statusOf(worst) === 'danger'
              ? 'danger'
              : worst && statusOf(worst) === 'warn'
                ? 'warn'
                : undefined
          }
        />
      </div>

      <div
        role={copy.tone === 'neutral' ? undefined : 'alert'}
        className={cn('flex gap-3 rounded-md border px-3 py-2.5 text-xs', TONE_STYLE[copy.tone])}
      >
        <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <p className="leading-relaxed">
          <span className="font-semibold">Confiabilidade: {copy.title}.</span> {copy.text}
        </p>
      </div>
    </div>
  )
}
