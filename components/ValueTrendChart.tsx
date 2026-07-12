'use client'

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/format'

export interface TrendPoint {
  date: string
  value: number
  cost: number
}

function shortMoney(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return `${v}`
}

interface TrendTooltipProps {
  active?: boolean
  label?: string | number
  payload?: { dataKey?: string | number; value?: number }[]
  currency: string
}

function TrendTooltip({ active, payload, label, currency }: TrendTooltipProps) {
  if (!active || !payload?.length) return null
  const value = payload.find((p) => p.dataKey === 'value')?.value ?? 0
  const cost = payload.find((p) => p.dataKey === 'cost')?.value ?? 0
  const pnl = Number(value) - Number(cost)
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-medium text-primary">{label}</div>
      <div className="tabular-nums text-secondary">
        평가금액 {formatCurrency(Number(value), currency)}
      </div>
      <div className="tabular-nums text-muted">
        투자원금 {formatCurrency(Number(cost), currency)}
      </div>
      <div
        className={`tabular-nums ${pnl >= 0 ? 'text-gain' : 'text-loss'}`}
      >
        손익 {pnl >= 0 ? '+' : ''}
        {formatCurrency(pnl, currency)}
      </div>
    </div>
  )
}

export function ValueTrendChart({
  data,
  currency = 'USD',
}: {
  data: TrendPoint[]
  currency?: string
}) {
  if (data.length < 2) {
    return (
      <div className="grid h-64 place-items-center text-sm text-secondary">
        추이를 표시하려면 스냅샷 데이터가 더 필요합니다.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={shortMoney}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<TrendTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#valueFill)"
            isAnimationActive={false}
            name="평가금액"
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            name="투자원금"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: 'var(--series-1)' }} />
          평가금액
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3" style={{ background: 'var(--text-muted)' }} />
          투자원금
        </span>
      </div>
    </div>
  )
}
