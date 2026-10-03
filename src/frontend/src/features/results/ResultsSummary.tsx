/**
 * Cabeçalho dos resultados: números que respondem "posso seguir com esta
 * configuração?" antes de qualquer tabela, mais o aviso de confiabilidade.
 */

import { Activity, AlertTriangle, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'

import type { PredictionResponse, Reliability } from '@/contract/v1'
import { formatCount } from '@/lib/format'
import { statusOf } from '@/lib/status'
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
  warn: 'border-status-warn bg-status-warn/10 text-wp-gray85',
  danger: 'border-status-danger bg-status-danger/10 text-wp-gray85',
} as const

const TONE_ICON = {
  warn: AlertTriangle,
  danger: OctagonAlert,
} as const

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
  const copy = RELIABILITY_COPY[reliability]
  const ToneIcon = copy.tone === 'neutral' ? null : TONE_ICON[copy.tone]

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

      {/* Interpolação (o caso bom) não ganha aviso: o ícone de cada sensor já diz. Extrapolação e
          fora do domínio continuam avisando, porque a leitura dos números muda (RN08). */}
      {copy.tone !== 'neutral' && (
        <div role="alert" className={cn('flex gap-3 rounded-lg border px-4 py-3 text-xs', TONE_STYLE[copy.tone])}>
          {ToneIcon && <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />}
          <p className="leading-relaxed">
            <span className="font-bold">Confiabilidade: {copy.title}.</span> {copy.text}
          </p>
        </div>
      )}
    </div>
  )
}
