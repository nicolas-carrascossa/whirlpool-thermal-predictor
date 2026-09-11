/**
 * Legenda do modo de cor ativo, dentro do viewport do mapa 3D (Fase 1d,
 * etapa D). Fica ancorada no canto inferior direito do card do canvas — é
 * HTML comum sobreposto ao `<Canvas>`, não `drei`'s `<Html>`, pelo mesmo
 * motivo do `<MapToolbar>`: não precisa girar com a câmera.
 */

import { formatTempPt } from './aggregate'
import type { LegendModel } from './legendModel'

function StatusRows({ model }: { model: Extract<LegendModel, { mode: 'status' }> }) {
  return (
    <ul className="flex flex-col gap-1">
      {model.rows.map((row) => (
        <li key={row.status} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-wp-gray20"
            style={{ background: row.color }}
            aria-hidden="true"
          />
          <span className="text-wp-gray65">{row.label}</span>
          <span className="tabular ml-auto pl-2 font-semibold text-wp-gray85">{row.count}</span>
        </li>
      ))}
    </ul>
  )
}

function AbsoluteBar({ model }: { model: Extract<LegendModel, { mode: 'absolute' }> }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2 w-40 rounded-full"
        style={{ background: 'linear-gradient(90deg, #00a0dd 0%, #eeb111 35%, #e08650 68%, #b3261e 100%)' }}
        aria-hidden="true"
      />
      <div className="tabular flex justify-between text-wp-gray65">
        <span>{formatTempPt(model.min, { withUnit: false })}</span>
        <span>{formatTempPt(model.ticks[1], { withUnit: false })}</span>
        <span>{formatTempPt(model.ticks[2], { withUnit: false })}</span>
        <span>{formatTempPt(model.ticks[3], { withUnit: false })}</span>
        <span>{formatTempPt(model.max, { withUnit: false })}</span>
      </div>
      <p className="text-wp-gray45">temperatura média por zona ({model.unit})</p>
    </div>
  )
}

function DeltaBar({ model }: { model: Extract<LegendModel, { mode: 'delta' }> }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2 w-40 rounded-full"
        style={{ background: 'linear-gradient(90deg, #0d436b 0%, #ffffff 50%, #e08650 100%)' }}
        aria-hidden="true"
      />
      <div className="tabular flex justify-between text-wp-gray65">
        <span>−{formatTempPt(model.maxAbs, { withUnit: false })}</span>
        <span>0</span>
        <span>+{formatTempPt(model.maxAbs, { withUnit: false })}</span>
      </div>
      <p className="text-wp-gray45">delta vs. referência ({model.unit})</p>
    </div>
  )
}

export function LegendOverlay({ model }: { model: LegendModel }) {
  return (
    <div
      role="group"
      aria-label="Legenda do mapa térmico"
      className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-md border border-wp-gray12 bg-white/95 px-2.5 py-2 font-body text-[12px] shadow-sm backdrop-blur"
    >
      {model.mode === 'status' && <StatusRows model={model} />}
      {model.mode === 'absolute' && <AbsoluteBar model={model} />}
      {model.mode === 'delta' && <DeltaBar model={model} />}
    </div>
  )
}
