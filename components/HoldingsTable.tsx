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
}: {
  holdings: EnrichedHolding[]
  currency?: string
}) {
  if (holdings.length === 0) {
    return (
      <div className="card p-8 text-center text-secondary">
        아직 보유 종목이 없습니다. 거래를 추가하면 여기에 표시됩니다.
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
          {holdings.map((h, i) => (
            <tr
              key={h.symbol}
              className="border-b border-border/60 last:border-0"
            >
              <td className="py-3 pl-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                    aria-hidden
                  />
                  <div>
                    <div className="font-medium text-primary">{h.symbol}</div>
                    {h.name && (
                      <div className="text-xs text-muted">{h.name}</div>
                    )}
                  </div>
                </div>
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
