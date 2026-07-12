'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { EnrichedHolding } from '@/lib/portfolio'
import { SERIES_COLORS, OTHER_COLOR } from '@/lib/colors'
import { formatCurrency } from '@/lib/format'

interface Slice {
  symbol: string
  value: number
  weight: number
  color: string
}

const MAX_SLICES = 8

function buildSlices(holdings: EnrichedHolding[]): Slice[] {
  const positive = holdings.filter((h) => h.marketValue > 0)
  const total = positive.reduce((s, h) => s + h.marketValue, 0)
  if (total <= 0) return []

  const named = (h: EnrichedHolding, i: number): Slice => ({
    symbol: h.symbol,
    value: h.marketValue,
    weight: h.marketValue / total,
    color: SERIES_COLORS[i % SERIES_COLORS.length],
  })

  // Up to MAX_SLICES holdings are all shown by name; only a 9th+ holding gets
  // folded into an "기타" bucket.
  if (positive.length <= MAX_SLICES) {
    return positive.map(named)
  }

  const slices: Slice[] = positive.slice(0, MAX_SLICES - 1).map(named)
  const rest = positive.slice(MAX_SLICES - 1)
  const restValue = rest.reduce((s, h) => s + h.marketValue, 0)
  slices.push({
    symbol: '기타',
    value: restValue,
    weight: restValue / total,
    color: OTHER_COLOR,
  })
  return slices
}

interface PieTooltipProps {
  active?: boolean
  payload?: { payload: Slice }[]
  currency: string
}

function ChartTooltip({ active, payload, currency }: PieTooltipProps) {
  if (!active || !payload?.length) return null
  const slice = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <div className="font-medium text-primary">{slice.symbol}</div>
      <div className="tabular-nums text-secondary">
        {formatCurrency(slice.value, currency)} · {(slice.weight * 100).toFixed(1)}%
      </div>
    </div>
  )
}

export function AllocationPieChart({
  holdings,
  currency = 'USD',
}: {
  holdings: EnrichedHolding[]
  currency?: string
}) {
  const slices = useMemo(() => buildSlices(holdings), [holdings])
  const total = slices.reduce((s, x) => s + x.value, 0)

  if (slices.length === 0) {
    return (
      <div className="grid h-64 place-items-center text-sm text-secondary">
        표시할 자산 배분 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="symbol"
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.symbol} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">총 평가금액</span>
          <span className="text-lg font-semibold tabular-nums text-primary">
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5">
        {slices.map((s) => (
          <li key={s.symbol} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="font-medium text-primary">{s.symbol}</span>
            <span className="ml-auto tabular-nums text-secondary">
              {(s.weight * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
