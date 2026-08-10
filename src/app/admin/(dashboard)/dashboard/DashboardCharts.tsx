'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCompactINR } from '@/lib/utils'

export interface DailyPoint    { day: string; orders: number; revenue: number }
export interface CategoryPoint { category: string; revenue: number }
export interface StatusPoint   { status: string; count: number; color: string }

const STATUS_COLORS: Record<string, string> = {
  placed:    '#6B7280',
  confirmed: '#3B82F6',
  packed:    '#F59E0B',
  shipping:  '#8B5CF6',
  delivered: '#0C831F',
  cancelled: '#ba1a1a',
}
const STATUS_COLOR_LIST = Object.values(STATUS_COLORS)

const BAR_COLORS = ['#26170c','#715a3e','#3d2b1f','#bc8d5f','#f0bd8b','#fdddb9','#e0c29f']

// Indian numbering (k / L / Cr) — see formatCompactINR.
const rupee = formatCompactINR

// ── Line chart: daily orders last 30 days ─────────────────────────────────────
export function DailyOrdersChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant/50 p-6 shadow-sm" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}>
      <div className="mb-4">
        <h4 className="font-headline-md text-headline-md text-primary">Daily Orders</h4>
        <p className="font-body-md text-body-md text-on-surface-variant">Last 30 days</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.5} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#4f453f', fontFamily: 'var(--font-poppins), sans-serif' }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fontSize: 11, fill: '#4f453f', fontFamily: 'var(--font-poppins), sans-serif' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#fdf9f1', border: '1px solid #d2c4bc', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-poppins), sans-serif' }}
            formatter={(v: unknown) => [String(v ?? ''), 'Orders']}
          />
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#26170c"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#26170c' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Bar chart: revenue by category ────────────────────────────────────────────
export function CategoryRevenueChart({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant/50 p-6 shadow-sm" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}>
      <div className="mb-4">
        <h4 className="font-headline-md text-headline-md text-primary">Revenue by Category</h4>
        <p className="font-body-md text-body-md text-on-surface-variant">This month</p>
      </div>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-on-surface-variant font-body-md text-body-md">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d2c4bc" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#4f453f', fontFamily: 'var(--font-poppins), sans-serif' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#4f453f', fontFamily: 'var(--font-poppins), sans-serif' }} tickLine={false} axisLine={false} tickFormatter={rupee} />
            <Tooltip
              contentStyle={{ background: '#fdf9f1', border: '1px solid #d2c4bc', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-poppins), sans-serif' }}
              formatter={(v: unknown) => [rupee(Number(v)), 'Revenue']}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Donut chart: order status breakdown ───────────────────────────────────────
export function StatusDonutChart({ data }: { data: StatusPoint[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="bg-surface rounded-xl border border-outline-variant/50 p-6 shadow-sm" style={{ boxShadow: '0px 4px 20px rgba(61,43,31,0.07)' }}>
      <div className="mb-4">
        <h4 className="font-headline-md text-headline-md text-primary">Order Status</h4>
        <p className="font-body-md text-body-md text-on-surface-variant">All time breakdown</p>
      </div>
      {total === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-on-surface-variant font-body-md text-body-md">No orders yet</div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="count"
                nameKey="status"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.status] ?? STATUS_COLOR_LIST[i % STATUS_COLOR_LIST.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#fdf9f1', border: '1px solid #d2c4bc', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-poppins), sans-serif' }}
                formatter={(v: unknown, name: unknown) => [String(v ?? ''), String(name ?? '')]}
              />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, fontFamily: 'var(--font-poppins), sans-serif', color: '#4f453f', textTransform: 'capitalize' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: -24 }}>
            <div className="text-center">
              <p className="font-headline-md text-headline-md text-primary leading-none">{total}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
