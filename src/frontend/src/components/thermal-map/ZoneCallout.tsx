/**
 * Rótulo (callout) de zona dentro da cena — Fase 1d, etapa C.
 *
 * Cartão branco ancorado na superfície da zona, ligado a ela por uma
 * linha-guia fina. A direção do deslocamento é fixa por zona
 * (`ZONE_LABEL_OFFSETS`), o que mantém os 7 rótulos separados na vista padrão
 * sem precisar de um algoritmo de colisão.
 */

import { Html, Line } from '@react-three/drei'

import { cn } from '@/lib/utils'

import { ZONE_STATUS_COLOR, ZONE_STATUS_LABEL_PT, type ZoneStatus } from './zoneStatus'
import { zoneAnchor, zoneLabelOffset } from './zoneGeometry'

export interface ZoneCalloutProps {
  zoneKey: string
  label: string
  /** Uma única medida já formatada, ex.: "máx 241,5 °C / lim 150,0 °C". */
  value: string
  status: ZoneStatus
  selected: boolean
  /** Zona sob o cursor (mas não selecionada) — borda `--wp-core` (etapa E). */
  hovered?: boolean
  onHover: (key: string) => void
  onUnhover: (key: string) => void
  onSelect: (key: string) => void
}

export function ZoneCallout({
  zoneKey,
  label,
  value,
  status,
  selected,
  hovered = false,
  onHover,
  onUnhover,
  onSelect,
}: ZoneCalloutProps) {
  const anchor = zoneAnchor(zoneKey)
  if (!anchor) return null
  const off = zoneLabelOffset(zoneKey)
  const tip: [number, number, number] = [anchor[0] + off[0], anchor[1] + off[1], anchor[2] + off[2]]

  return (
    <group>
      <Line
        points={[anchor, tip]}
        color={selected ? '#475569' : '#9fa0a1'}
        lineWidth={selected ? 1.6 : 1}
        transparent
        opacity={0.85}
      />
      <Html position={tip} center zIndexRange={[20, 10]} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          data-zone-callout={zoneKey}
          onPointerEnter={() => onHover(zoneKey)}
          onPointerLeave={() => onUnhover(zoneKey)}
          onClick={() => onSelect(zoneKey)}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border bg-white px-2 py-1 text-left shadow-sm transition-colors',
            selected
              ? 'border-wp-accent ring-1 ring-wp-accent'
              : hovered
                ? 'border-wp-core'
                : 'border-wp-gray12 hover:border-wp-accent',
          )}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: ZONE_STATUS_COLOR[status] }}
            aria-hidden="true"
            title={ZONE_STATUS_LABEL_PT[status]}
          />
          {/* largura limitada: os nomes de área em pt-BR são longos e um cartão
              largo demais sai do card do mapa e cobre o fogão */}
          <span className="flex min-w-0 max-w-[170px] flex-col leading-tight">
            <span className="truncate font-body text-[12px] font-semibold text-wp-gray85" title={label}>
              {label}
            </span>
            <span className="tabular whitespace-nowrap font-body text-[12px] text-wp-gray65">{value}</span>
          </span>
        </button>
      </Html>
    </group>
  )
}
