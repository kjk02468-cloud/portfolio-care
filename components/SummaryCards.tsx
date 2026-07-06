import type { PortfolioSummary } from '@/lib/portfolio'
import { formatCurrency, formatPercent, formatSignedCurrency } from '@/lib/format'

function DeltaText({ value, suffix }: { value: number; suffix?: string }) {
  const cls = value > 0 ? 'text-gain' : value < 0 ? 'text-loss' : 'text-muted'
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '·'
  return (
    <span className={`tabular-nums ${cls}`}>
      {arrow} {suffix}
    </span>
  )
}

function Card({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-secondary">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function SummaryCards({
  summary,
  currency = 'USD',
}: {
  summary: PortfolioSummary
  currency?: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="총 평가금액">
        <p className="text-2xl font-semibold tabular-nums text-primary">
          {formatCurrency(summary.totalValue, currency)}
        </p>
        <p className="mt-1 text-sm">
          <DeltaText
            value={summary.dayChange}
            suffix={`${formatSignedCurrency(summary.dayChange, currency)} (${formatPercent(summary.dayChangePercent)}) 오늘`}
          />
        </p>
      </Card>

      <Card label="투자 원금">
        <p className="text-2xl font-semibold tabular-nums text-primary">
          {formatCurrency(summary.totalCost, currency)}
        </p>
        <p className="mt-1 text-sm text-muted">보유 종목 매입가 합계</p>
      </Card>

      <Card label="평가 손익">
        <p
          className={`text-2xl font-semibold tabular-nums ${
            summary.totalUnrealizedPnl >= 0 ? 'text-gain' : 'text-loss'
          }`}
        >
          {formatSignedCurrency(summary.totalUnrealizedPnl, currency)}
        </p>
        <p className="mt-1 text-sm">
          <DeltaText
            value={summary.totalUnrealizedPnl}
            suffix={formatPercent(summary.totalUnrealizedPnlPercent)}
          />
        </p>
      </Card>

      <Card label="실현 손익">
        <p
          className={`text-2xl font-semibold tabular-nums ${
            summary.totalRealizedPnl >= 0 ? 'text-gain' : 'text-loss'
          }`}
        >
          {formatSignedCurrency(summary.totalRealizedPnl, currency)}
        </p>
        <p className="mt-1 text-sm text-muted">매도로 확정된 손익</p>
      </Card>
    </div>
  )
}
