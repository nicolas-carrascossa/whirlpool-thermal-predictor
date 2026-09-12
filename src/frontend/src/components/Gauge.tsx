import { formatNumber, formatTemp } from '@/lib/format'

interface GaugeProps {
  value: number
  max: number
  label: string
  size?: number
}

/** Gauge circular simples via SVG. Cor por razão: ok < 0.9, atenção 0.9–1.0, excede >= 1.0. */
export function Gauge({ value, max, label, size = 140 }: GaugeProps) {
  const ratio = max > 0 ? value / max : 0
  const clamped = Math.min(Math.max(ratio, 0), 1.15)
  const color =
    ratio >= 1 ? 'var(--status-danger)' : ratio >= 0.9 ? 'var(--status-warn)' : 'var(--status-ok)'

  const strokeWidth = size * 0.09
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const arcFraction = Math.min(clamped, 1)
  const dashOffset = circumference * (1 - arcFraction)

  return (
    <div
      className="flex flex-col items-center gap-2"
      role="img"
      aria-label={`${label}: ${formatTemp(value)} de ${formatTemp(max)}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--wp-gray-12)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-2xl font-semibold" style={{ color }}>
            {formatNumber(value)}
          </span>
          <span className="text-xs text-wp-gray65">de {formatTemp(max)}</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-wp-gray85">{label}</span>
    </div>
  )
}
