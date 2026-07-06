import { formatCurrency, formatPercent } from '@/lib/format'

/**
 * A lightweight comparison of average cost vs. current price — no chart library,
 * no price history, just the two values we already have. The segment between
 * them is colored green when in profit, red when at a loss.
 */
export function CostVsPriceBar({
  avgCost,
  currentPrice,
  currency = 'USD',
}: {
  avgCost: number
  currentPrice: number
  currency?: string
}) {
  const lo = Math.min(avgCost, currentPrice)
  const hi = Math.max(avgCost, currentPrice)
  const pad = hi - lo || hi * 0.05 || 1
  const domainLo = lo - pad
  const domainHi = hi + pad
  const span = domainHi - domainLo

  const pct = (v: number) => ((v - domainLo) / span) * 100
  const gain = currentPrice >= avgCost
  const diffPercent = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0

  const avgPos = pct(avgCost)
  const pricePos = pct(currentPrice)
  const segLeft = Math.min(avgPos, pricePos)
  const segWidth = Math.abs(pricePos - avgPos)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-secondary">
          평균단가{' '}
          <span className="font-medium text-primary">
            {formatCurrency(avgCost, currency)}
          </span>
        </span>
        <span className={`font-medium ${gain ? 'text-gain' : 'text-loss'}`}>
          {formatPercent(diffPercent)}
        </span>
        <span className="text-secondary">
          현재가{' '}
          <span className="font-medium text-primary">
            {formatCurrency(currentPrice, currency)}
          </span>
        </span>
      </div>

      <div className="relative h-2.5 rounded-full bg-surface-2">
        <div
          className={`absolute top-0 h-2.5 rounded-full ${
            gain ? 'bg-gain/30' : 'bg-loss/30'
          }`}
          style={{ left: `${segLeft}%`, width: `${segWidth}%` }}
        />
        {/* average cost marker */}
        <Marker pos={avgPos} className="bg-muted" label="평단" />
        {/* current price marker */}
        <Marker
          pos={pricePos}
          className={gain ? 'bg-gain' : 'bg-loss'}
          label="현재"
        />
      </div>
    </div>
  )
}

function Marker({
  pos,
  className,
  label,
}: {
  pos: number
  className: string
  label: string
}) {
  return (
    <div
      className="absolute top-1/2 flex flex-col items-center"
      style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
    >
      <span className={`h-3.5 w-3.5 rounded-full ring-2 ring-surface ${className}`} />
      <span className="mt-1 text-[10px] text-muted">{label}</span>
    </div>
  )
}
