import type { PortfolioSummary } from '@/lib/portfolio'
import { formatPercent, formatSignedCurrency } from '@/lib/format'
import { AnimatedNumber } from './AnimatedNumber'

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
  index,
  children,
}: {
  label: string
  index: number
  children: React.ReactNode
}) {
  return (
    <div
      className="card animate-rise p-5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
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
      <Card label="총 평가금액" index={0}>
        <AnimatedNumber
          value={summary.totalValue}
          currency={currency}
          className="block text-3xl font-bold tracking-tight tabular-nums text-primary"
        />
        <p className="mt-1.5 text-sm">
          <DeltaText
            value={summary.dayChange}
            suffix={`${formatSignedCurrency(summary.dayChange, currency)} (${formatPercent(summary.dayChangePercent)}) 오늘`}
          />
        </p>
      </Card>

      <Card label="투자 원금" index={1}>
        <AnimatedNumber
          value={summary.totalCost}
          currency={currency}
          className="block text-3xl font-bold tracking-tight tabular-nums text-primary"
        />
        <p className="mt-1.5 text-sm text-muted">보유 종목 매입가 합계</p>
      </Card>

      <Card label="평가 손익" index={2}>
        <AnimatedNumber
          value={summary.totalUnrealizedPnl}
          kind="signed"
          currency={currency}
          className={`block text-3xl font-bold tracking-tight tabular-nums ${
            summary.totalUnrealizedPnl >= 0 ? 'text-gain' : 'text-loss'
          }`}
        />
        <p className="mt-1.5 text-sm">
          <DeltaText
            value={summary.totalUnrealizedPnl}
            suffix={formatPercent(summary.totalUnrealizedPnlPercent)}
          />
        </p>
      </Card>

      <Card label="실현 손익" index={3}>
        <AnimatedNumber
          value={summary.totalRealizedPnl}
          kind="signed"
          currency={currency}
          className={`block text-3xl font-bold tracking-tight tabular-nums ${
            summary.totalRealizedPnl >= 0 ? 'text-gain' : 'text-loss'
          }`}
        />
        <p className="mt-1.5 text-sm text-muted">매도로 확정된 손익</p>
      </Card>
    </div>
  )
}
