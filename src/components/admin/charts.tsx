'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { cn, formatCompactINR } from '@/lib/utils'

/**
 * The admin's one chart kit, so the dashboard and analytics read the same way:
 * indigo for money, lavender for counts, plain labels, and a clear message
 * instead of an empty grid when there is nothing to show yet.
 *
 * Recharts needs literal colours (it draws SVG attributes), so the palette is
 * mirrored here from the tokens in globals.css.
 */
export const C = {
  ink: '#292966',
  indigo: '#5C5C99',
  lavender: '#A3A3CC',
  peri: '#CCCCFF',
  line: '#DCDCEC',
  muted: '#55557A',
  paper: '#FDFDFF',
}

export const STATUS_META: Record<string, { label: string; color: string }> = {
  placed: { label: 'New, to confirm', color: '#A3A3CC' },
  confirmed: { label: 'Confirmed', color: '#5C5C99' },
  packed: { label: 'Packed', color: '#B7791F' },
  shipping: { label: 'Out for delivery', color: '#383880' },
  delivered: { label: 'Delivered', color: '#2E7D4F' },
  cancelled: { label: 'Cancelled', color: '#B3261E' },
  returned: { label: 'Returned', color: '#8A6D3B' },
}

import { inr } from '@/lib/format'
export { inr }

export function ChartCard({
  title, sub, action, children, className,
}: { title: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-table-border bg-surface-card p-5 md:p-6', className)}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-primary">{title}</h2>
          {sub && <p className="mt-0.5 text-[14px] text-on-surface-variant">{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function EmptyChart({ text, height = 220 }: { text: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-table-border bg-surface px-6 text-center text-[15px] text-on-surface-variant"
      style={{ height }}
    >
      {text}
    </div>
  )
}

/** A KPI tile with an optional change against the previous period. */
export function Kpi({
  label, value, change, hint, href, tone = 'plain',
}: {
  label: string
  value: string
  /** Fractional change vs the previous period, e.g. 0.12 = +12%. null = no comparison. */
  change?: number | null
  hint?: string
  href?: string
  tone?: 'plain' | 'strong' | 'alert'
}) {
  const body = (
    <>
      <p className={cn('text-[14px] font-semibold', tone === 'strong' ? 'text-paper-raised/80' : 'text-on-surface-variant')}>{label}</p>
      <p className={cn('mt-2 text-[30px] font-bold leading-none tabular-nums', tone === 'strong' ? 'text-paper-raised' : tone === 'alert' ? 'text-error' : 'text-primary')}>
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px]">
        {change !== undefined && change !== null && Number.isFinite(change) && (
          <span
            className={cn(
              'font-semibold',
              tone === 'strong' ? 'text-periwinkle' : change > 0 ? 'text-success' : change < 0 ? 'text-error' : 'text-on-surface-variant',
            )}
          >
            {change > 0 ? '↑' : change < 0 ? '↓' : ''} {Math.abs(Math.round(change * 100))}%
          </span>
        )}
        {hint && <span className={tone === 'strong' ? 'text-paper-raised/70' : 'text-on-surface-variant'}>{hint}</span>}
      </div>
    </>
  )
  const cls = cn(
    'block rounded-2xl border p-5 transition-colors',
    tone === 'strong' ? 'border-primary bg-primary' : tone === 'alert' ? 'border-error/30 bg-error/5' : 'border-table-border bg-surface-card',
    href && 'hover:border-primary/40',
  )
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
}

/** Revenue (line, left axis) over order count (bars, right axis). */
export function TrendChart({
  data, height = 260,
}: { data: { label: string; revenue: number; orders: number }[]; height?: number }) {
  if (!data.some((d) => d.orders > 0)) {
    return <EmptyChart text="No orders in this period yet. New orders will show here as they come in." height={height} />
  }
  const tick = { fontSize: 12, fill: C.muted }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={C.line} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis yAxisId="rev" tick={tick} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCompactINR(v)} />
        <YAxis yAxisId="ord" orientation="right" tick={tick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: C.peri, fillOpacity: 0.35 }}
          contentStyle={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 13 }}
          formatter={(v: unknown, name: unknown) => (name === 'Revenue' ? [inr(Number(v)), 'Revenue'] : [String(v), 'Orders'])}
        />
        <Bar yAxisId="ord" dataKey="orders" name="Orders" fill={C.peri} radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={C.ink} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** A ranked list with proportional bars; clearer than a chart for "top N". */
const FORMATS = {
  inr: (v: number) => inr(v),
  times: (v: number) => `${v}×`,
  checks: (v: number) => `${v} ${v === 1 ? 'check' : 'checks'}`,
} as const

export function RankList({
  rows, format = 'inr', empty,
}: {
  rows: { label: string; value: number; note?: string; href?: string }[]
  /** How to print each value. A name, not a function, so server pages can pass it. */
  format?: keyof typeof FORMATS
  empty: string
}) {
  const valueLabel = FORMATS[format]
  if (!rows.length) return <EmptyChart text={empty} height={160} />
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="min-w-0 truncate font-semibold text-primary capitalize">
              <span className="mr-2 tabular-nums text-on-surface-variant">{i + 1}.</span>
              {r.href ? <Link href={r.href} className="hover:underline">{r.label}</Link> : r.label}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-primary">
              {valueLabel(r.value)}
              {r.note && <span className="ml-2 font-normal text-on-surface-variant">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-container">
            <div className="h-2 rounded-full bg-secondary" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Orders by status as one stacked bar plus a readable legend with counts. */
export function StatusBreakdown({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(STATUS_META)
    .map(([k, m]) => ({ key: k, ...m, count: counts[k] ?? 0 }))
    .filter((e) => e.count > 0)
  const total = entries.reduce((s, e) => s + e.count, 0)
  if (!total) return <EmptyChart text="No orders in this period yet." height={160} />
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full">
        {entries.map((e) => (
          <div key={e.key} style={{ width: `${(e.count / total) * 100}%`, background: e.color }} title={`${e.label}: ${e.count}`} />
        ))}
      </div>
      <ul className="mt-5 grid gap-y-2.5">
        {entries.map((e) => (
          <li key={e.key} className="flex items-center justify-between gap-2 text-[14px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: e.color }} aria-hidden="true" />
              <span className="truncate text-primary">{e.label}</span>
            </span>
            <span className="tabular-nums font-semibold text-primary">
              {e.count}
              <span className="ml-1 font-normal text-on-surface-variant">{Math.round((e.count / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
