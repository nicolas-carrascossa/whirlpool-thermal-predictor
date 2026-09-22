import { formatTemp } from '@/lib/format'

export function HeatScaleLegend({ min = 0, max = 100 }: { min?: number; max?: number }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div
        className="h-3 w-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, #00a0dd 0%, #eeb111 45%, #e08650 70%, #b3261e 100%)',
        }}
      />
      <div className="tabular flex justify-between text-xs text-wp-gray65">
        <span>{formatTemp(min)}</span>
        <span>{formatTemp(max)}</span>
      </div>
    </div>
  )
}
