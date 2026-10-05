import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Gauge } from '@/components/Gauge'
import { HeatScaleLegend } from '@/components/HeatScaleLegend'
import { ReliabilityBadge, StatusBadge } from '@/components/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const COLOR_TOKENS: { name: string; varName: string; hex: string }[] = [
  { name: 'Accomplished Blue (núcleo)', varName: '--wp-core', hex: '#0d436b' },
  { name: 'Accent Slate', varName: '--wp-accent', hex: '#94a3b8' },
  { name: 'Light Accent Slate', varName: '--wp-accent-lt', hex: '#eef1f5' },
  { name: 'Cinza 05', varName: '--wp-gray-05', hex: '#f5f6f7' },
  { name: 'Cinza 12', varName: '--wp-gray-12', hex: '#dee0e3' },
  { name: 'Cinza 20', varName: '--wp-gray-20', hex: '#d1d3d4' },
  { name: 'Cinza 45', varName: '--wp-gray-45', hex: '#9fa0a1' },
  { name: 'Cinza 65', varName: '--wp-gray-65', hex: '#767777' },
  { name: 'Cinza 85', varName: '--wp-gray-85', hex: '#484949' },
  { name: 'Branco', varName: '--wp-white', hex: '#ffffff' },
  { name: 'Status OK (verde sóbrio)', varName: '--status-ok', hex: '#5aa469' },
  { name: 'Status Atenção (âmbar)', varName: '--status-warn', hex: '#f4a63c' },
  { name: 'Status Excede (fora da paleta)', varName: '--status-danger', hex: '#cf5f57' },
]

const SENSOR_ROWS = [
  { name: 'TC01 — Console', temp: 68.4, margin: 3.2, marginPct: 4.1, limit: 85, status: 'ok' as const },
  { name: 'TC14 — IPC', temp: 92.1, margin: 4.6, marginPct: 5.0, limit: 95, status: 'warn' as const },
  { name: 'TC27 — Ventilação', temp: 41.8, margin: 2.1, marginPct: 5.0, limit: 60, status: 'ok' as const },
  { name: 'TC33 — Deflector', temp: 118.7, margin: 5.9, marginPct: 5.0, limit: 110, status: 'danger' as const },
  { name: 'TC52 — Suporte da bobina', temp: 76.2, margin: 3.0, marginPct: 3.9, limit: 90, status: 'ok' as const },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border py-10 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl font-light text-wp-core">{title}</h2>
      {children}
    </section>
  )
}

export function StyleguidePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-12">
      <p className="text-xs font-bold uppercase tracking-[0.05em] text-wp-accent font-display">
        Inteli × Whirlpool
      </p>
      <h1 className="font-display text-4xl font-light text-wp-core">Guia de estilo</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-wp-gray65">
        Referência visual do Thermal Predictor, derivada do style guide oficial da Whirlpool.
        Fundo branco dominante, cor-núcleo Accomplished Blue, ícones de linha, texto alinhado à
        esquerda e entrelinha de pelo menos 120%.
      </p>

      <Section title="Cores">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {COLOR_TOKENS.map((token) => (
            <div key={token.varName} className="flex flex-col gap-2">
              <div
                className="h-16 w-full rounded-md border border-border"
                style={{ backgroundColor: token.hex }}
              />
              <div>
                <p className="text-sm font-semibold text-wp-gray85">{token.name}</p>
                <p className="tabular text-xs text-wp-gray65">{token.hex}</p>
                <p className="font-mono text-[11px] text-wp-gray45">{token.varName}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-wp-accent font-display">
              Kicker — Nunito Sans 700, 12px, tracking 0.05em, uppercase
            </p>
          </div>
          <div>
            <h3 className="font-display text-4xl font-light text-wp-core">
              Título — Nunito Sans 300
            </h3>
          </div>
          <div>
            <p className="font-body text-lg font-semibold text-wp-gray85">
              Subtítulo — Open Sans 600
            </p>
          </div>
          <div>
            <p className="font-body text-sm text-wp-gray85">
              Corpo — Open Sans 400, 14px, entrelinha ≥ 1.2, usado em parágrafos e descrições.
            </p>
          </div>
          <div>
            <p className="tabular text-lg text-wp-gray85">92,1 °C — Noto Sans Mono, tabular-nums</p>
          </div>
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Prever</Button>
          <Button variant="secondary">Configuração de referência</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="outline">Exportar</Button>
          <Button variant="destructive">Remover</Button>
        </div>
      </Section>

      <Section title="Badges de status e confiabilidade">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="ok" />
          <StatusBadge status="warn" />
          <StatusBadge status="danger" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReliabilityBadge reliability="interpolation" />
          <ReliabilityBadge reliability="moderate_extrapolation" />
          <ReliabilityBadge reliability="out_of_domain" />
        </div>
      </Section>

      <Section title="Tabela densa de sensores">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sensor</TableHead>
              <TableHead>Temperatura</TableHead>
              <TableHead>Margem de erro</TableHead>
              <TableHead>Limite</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SENSOR_ROWS.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="font-semibold">{row.name}</TableCell>
                <TableCell className="tabular">{row.temp.toFixed(1)} °C</TableCell>
                <TableCell className="tabular">
                  ± {row.margin.toFixed(1).replace('.', ',')} °C ({row.marginPct.toFixed(1).replace('.', ',')} %)
                </TableCell>
                <TableCell className="tabular">{row.limit.toFixed(1)} °C</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Gauge circular">
        <div className="flex flex-wrap gap-8">
          <Gauge value={68.4} max={85} label="Console" />
          <Gauge value={92.1} max={95} label="IPC" />
          <Gauge value={118.7} max={110} label="Deflector" />
        </div>
      </Section>

      <Section title="Escala de calor (mapa 3D e gauges)">
        <div className="max-w-xl">
          <HeatScaleLegend min={25} max={130} />
        </div>
      </Section>
    </main>
  )
}
