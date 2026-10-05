/**
 * Decisão da CONFIGURAÇÃO consultada: junta as respostas dos modelos de cada
 * área, mas só onde a configuração é um ensaio de teste — onde era de treino o
 * modelo já viu a resposta e o acerto não prova nada.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ConfusionMatrix } from './ConfusionMatrix'
import { singleOutcome, type ConfigurationDecision as Decision } from './metricsModel'

const OUTCOME_LABEL = { tp: 'TP', fp: 'FP', fn: 'FN', tn: 'TN' } as const
const OUTCOME_TEXT = {
  tp: 'aprovou, e estava dentro do limite',
  fp: 'aprovou, mas excede o limite',
  fn: 'reprovou, mas estava dentro do limite',
  tn: 'reprovou, e excede o limite',
} as const

export function ConfigurationDecision({
  decision,
  areaLabels,
}: {
  decision: Decision
  areaLabels: Record<string, string>
}) {
  if (decision.coveredAreas === 0) {
    return (
      <p className="py-8 text-center text-sm text-wp-gray65">
        Esta configuração não é um ensaio de teste em nenhuma área do recorte: ou foi usada no treino, ou não foi
        medida. Sem medição de laboratório não há como conferir a decisão.
      </p>
    )
  }
  const overall = singleOutcome(decision.design)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 min-[1100px]:grid-cols-2">
        <ConfusionMatrix counts={decision.readings} unit="leituras" />
        <div className="overflow-x-auto rounded-md border border-wp-gray12 self-start">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">TP</TableHead>
                <TableHead className="text-right">FP</TableHead>
                <TableHead className="text-right">FN</TableHead>
                <TableHead className="text-right">TN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decision.areas.map((r) => (
                <TableRow key={r.keyArea}>
                  <TableCell className="font-medium">{areaLabels[r.keyArea] ?? r.keyArea}</TableCell>
                  {r.hasTestRun ? (
                    (['tp', 'fp', 'fn', 'tn'] as const).map((k) => (
                      <TableCell
                        key={k}
                        className={cn(
                          'tabular text-right',
                          k === 'fp' && r.readings.fp > 0 && 'font-semibold text-status-danger-ink',
                        )}
                      >
                        {formatCount(r.readings[k])}
                      </TableCell>
                    ))
                  ) : (
                    <TableCell colSpan={4} className="text-right text-wp-gray65">
                      sem ensaio de teste
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {overall ? (
        <p className="text-sm text-wp-gray85">
          Design inteiro ({formatCount(decision.coveredAreas)} de {formatCount(decision.areas.length)} áreas):{' '}
          <strong>
            {OUTCOME_LABEL[overall]} — {OUTCOME_TEXT[overall]}.
          </strong>
        </p>
      ) : null}
    </div>
  )
}
