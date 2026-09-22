import { formatTempPt } from './aggregate'

/** Legenda da escala divergente do modo delta: −Δ / 0 / +Δ em °C. */
export function DeltaScaleLegend({ maxAbs }: { maxAbs: number }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className="h-3 w-full rounded-full"
        style={{ background: 'linear-gradient(90deg, #0d436b 0%, #ffffff 50%, #e08650 100%)' }}
      />
      <div className="tabular flex justify-between text-xs text-wp-gray65">
        <span>{formatTempPt(-maxAbs, { withSign: true })}</span>
        <span>0,0 °C</span>
        <span>{formatTempPt(maxAbs, { withSign: true })}</span>
      </div>
    </div>
  )
}
