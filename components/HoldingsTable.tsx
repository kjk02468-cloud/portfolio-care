import Link from 'next/link'
import type { EnrichedHolding } from '@/lib/portfolio'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
} from '@/lib/format'
import { SERIES_COLORS } from '@/lib/colors'

export function HoldingsTable({
  holdings,
  currency = 'USD',
  hrefFor,
}: {
  holdings: EnrichedHolding[]
  currency?: string
  /** When provided, each row's symbol links to this href (per-portfolio detail). */
  hrefFor?: (symbol: string) => string
}) {
  // Only show open positions. Fully-sold symbols (quantity 0) are kept upstream
  // so their realized P&L still counts toward the summary, but they would render
  // as confusing $0 rows here.
  const open = holdings.filter((h) => h.quantity > 0)

  if (open.length === 0) {
    return (
      <div className="card p-8 text-center text-secondary">
        아직 담은 종목이 없어요. 첫 거래를 추가하면 여기에 나타나요.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-secondary">
            <Th className="pl-5">종목</Th>
            <Th className="text-right">수량</Th>
            <Th className="text-right">평균단가</Th>
            <Th className="text-right">현재가</Th>
            <Th className="text-right">평가금액</Th>
            <Th className="text-right">평가손익</Th>
            <Th className="text-right pr-5">비중</Th>
          </tr>
        </thead>
        <tbody>
          {open.map((h, i) => (
            <tr
              key={h.symbol}
              className="border-b border-border/60 last:border-0"
            >
              <td className="py-3 pl-5">
                {(() => {
                  const inner = (
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          background: SERIES_COLORS[i % SERIES_COLORS.length],
                        }}
                        aria-hidden
                      />
                      <div>
                        <div className="flex items-center gap-1 font-medium text-primary">
                          {h.symbol}
                          {hrefFor && (
                            <span className="text-muted" aria-hidden>
                              ›
                            </span>
                          )}
                        </div>
                        {h.name && (
                          <div className="text-xs text-muted">{h.name}</div>
                        )}
                      </div>
                    </div>
                  )
                  return hrefFor ? (
                    <Link
                      href={hrefFor(h.symbol)}
                      className="-m-1 inline-block rounded-lg p-1 transition hover:bg-surface-2"
                    >
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )
                })()}
              </td>
              <Td>{formatNumber(h.quantity)}</Td>
              <Td>{formatCurrency(h.avgCost, currency)}</Td>
              <Td>{formatCurrency(h.currentPrice, currency)}</Td>
              <Td className="font-medium text-primary">
                {formatCurrency(h.marketValue, currency)}
              </Td>
              <td className="py-3 text-right tabular-nums">
                <div
                  className={h.unrealizedPnl >= 0 ? 'text-gain' : 'text-loss'}
                >
                  {formatSignedCurrency(h.unrealizedPnl, currency)}
                </div>
                <div
                  className={`text-xs ${
                    h.unrealizedPnl >= 0 ? 'text-gain' : 'text-loss'
                  }`}
                >
                  {formatPercent(h.unrealizedPnlPercent)}
                </div>
              </td>
              <Td className="pr-5">{(h.weight * 100).toFixed(1)}%</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th className={`px-3 py-3 font-medium ${className}`}>{children}</th>
  )
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={`px-3 py-3 text-right tabular-nums text-secondary ${className}`}>
      {children}
    </td>
  )
}
