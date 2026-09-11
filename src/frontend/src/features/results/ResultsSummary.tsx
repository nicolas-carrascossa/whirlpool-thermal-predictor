/**
 * Cabeçalho dos resultados: números que respondem "posso seguir com esta
 * configuração?" antes de qualquer tabela, mais o aviso de confiabilidade.
 */

import { AlertTriangle, Info, OctagonAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Metadata, PredictionRequest, PredictionResponse, Reliability, StoveConfig } from '@/contract/v1'
import { formatCount, formatDateTime, formatRatioPct, formatTemp } from '@/lib/format'
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
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-wp-gray65">{label}</span>
      <span className={cn('tabular text-2xl leading-none', color)}>{value}</span>
      {hint && <span className="line-clamp-2 text-xs leading-snug text-wp-gray65">{hint}</span>}
    </div>
  )
}

/**
 * Faixa compacta com os 7 valores da configuração submetida, para que o
 * usuário não perca de vista qual configuração gerou os números ao rolar a
 * tela. `losses` e `board_position` aparecem esmaecidos (não usados pelo
 * modelo, H2).
 */
function ConfigStrip({
  config,
  architectureLabel,
  metadata,
  isPreview = false,
}: {
  config: StoveConfig
  architectureLabel: string
  metadata: Metadata | undefined
  /** `true` quando o rascunho do formulário já diverge desta configuração (Fase 1c). */
  isPreview?: boolean
}) {
  const variableMeta = new Map((metadata?.variables ?? []).map((v) => [v.name, v]))
  const entries = Object.entries(config) as [keyof StoveConfig, string][]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-wp-gray12 bg-wp-gray05 px-3 py-2 font-body text-xs">
      <span className="font-display font-semibold uppercase tracking-wide text-wp-core">
        {architectureLabel}
        {isPreview && (
          <span className="ml-1.5 font-body text-[11px] font-normal normal-case tracking-normal text-wp-gray65">
            (última predição)
          </span>
        )}
      </span>
      {entries.map(([field, value]) => {
        const meta = variableMeta.get(field)
        const usedByModel = meta?.used_by_model ?? true
        const label = meta?.label_pt ?? field
        return (
          <span
            key={field}
            className={cn('whitespace-nowrap', usedByModel ? 'text-wp-gray85' : 'text-wp-gray45')}
            title={usedByModel ? undefined : 'não usado pelo modelo'}
          >
            {label}: <span className="font-semibold">{value}</span>
          </span>
        )
      })}
    </div>
  )
}

export function ResultsSummary({
  response,
  metadata,
  request,
  isPreview = false,
}: {
  response: PredictionResponse
  metadata?: Metadata
  request?: PredictionRequest | null
  /** `true` quando o rascunho do formulário já diverge da consulta submetida. */
  isPreview?: boolean
}) {
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

  const architectureLabel =
    metadata?.architectures.find((a) => a.code === response.architecture)?.label_pt ??
    response.architecture

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        {request?.config && (
          <ConfigStrip
            config={request.config}
            architectureLabel={architectureLabel}
            metadata={metadata}
            isPreview={isPreview}
          />
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            hint={
              worst
                ? `${worst.tc_name} · ${formatTemp(worst.temp_c)} / ${formatTemp(worst.active_limit_c)}`
                : 'nenhum sensor com limite normativo'
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-wp-gray65">
          <Badge variant="outline" className="font-mono">
            {response.model_version}
          </Badge>
          <span>Consulta {response.request_id}</span>
          <span>Gerado em {formatDateTime(response.generated_at)}</span>
          {response.ignored_fields.length > 0 && (
            <span>Campos ignorados pelo modelo: {response.ignored_fields.join(', ')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
