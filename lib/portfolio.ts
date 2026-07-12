import type { Quote } from './market'

// Minimal shape we need from a transaction record (matches the Prisma model).
export interface TxLike {
  symbol: string
  name?: string | null
  assetType?: string | null
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  fee: number
  tradedAt: Date | string
}

export interface Holding {
  symbol: string
  name: string | null
  assetType: string
  quantity: number
  avgCost: number
  costBasis: number
  realizedPnl: number
}

export interface EnrichedHolding extends Holding {
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  dayChange: number
  weight: number // fraction of total market value (0..1)
  quoteSource: Quote['source'] | null
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalUnrealizedPnl: number
  totalUnrealizedPnlPercent: number
  totalRealizedPnl: number
  dayChange: number
  dayChangePercent: number
}

/**
 * Collapse a transaction history into current holdings using the
 * average-cost method. Transactions are sorted by trade date so buys and
 * sells are applied chronologically.
 */
export function computeHoldings(transactions: TxLike[]): Holding[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime(),
  )

  const map = new Map<string, Holding>()

  for (const tx of sorted) {
    const symbol = tx.symbol.toUpperCase()
    const h =
      map.get(symbol) ??
      ({
        symbol,
        name: tx.name ?? null,
        assetType: tx.assetType ?? 'STOCK',
        quantity: 0,
        avgCost: 0,
        costBasis: 0,
        realizedPnl: 0,
      } satisfies Holding)

    if (tx.name) h.name = tx.name

    if (tx.side === 'BUY') {
      h.costBasis += tx.quantity * tx.price + tx.fee
      h.quantity += tx.quantity
      h.avgCost = h.quantity > 0 ? h.costBasis / h.quantity : 0
    } else {
      // SELL: realize P&L against the running average cost, then reduce basis.
      const sellQty = Math.min(tx.quantity, h.quantity)
      const proceeds = sellQty * tx.price - tx.fee
      const costOfSold = sellQty * h.avgCost
      h.realizedPnl += proceeds - costOfSold
      h.quantity -= sellQty
      h.costBasis = h.quantity > 0 ? h.avgCost * h.quantity : 0
      if (h.quantity <= 0) h.avgCost = 0
    }

    map.set(symbol, h)
  }

  // Keep symbols with an open position or realized activity worth showing.
  return Array.from(map.values())
    .map((h) => ({
      ...h,
      quantity: Math.round(h.quantity * 1e8) / 1e8,
    }))
    .filter((h) => h.quantity > 0 || h.realizedPnl !== 0)
}

/** Attach live quotes to holdings and compute market value / P&L / weights. */
export function enrichHoldings(
  holdings: Holding[],
  quotes: Record<string, Quote>,
): { holdings: EnrichedHolding[]; summary: PortfolioSummary } {
  const enriched: EnrichedHolding[] = holdings.map((h) => {
    const q = quotes[h.symbol]
    const currentPrice = q?.price ?? h.avgCost
    const marketValue = currentPrice * h.quantity
    const unrealizedPnl = marketValue - h.costBasis
    const unrealizedPnlPercent =
      h.costBasis > 0 ? (unrealizedPnl / h.costBasis) * 100 : 0
    const dayChange = (q?.change ?? 0) * h.quantity
    return {
      ...h,
      currentPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPercent,
      dayChange,
      weight: 0,
      quoteSource: q?.source ?? null,
    }
  })

  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0)
  for (const h of enriched) {
    h.weight = totalValue > 0 ? h.marketValue / totalValue : 0
  }
  // Largest position first.
  enriched.sort((a, b) => b.marketValue - a.marketValue)

  const totalCost = enriched.reduce((s, h) => s + h.costBasis, 0)
  const totalRealizedPnl = enriched.reduce((s, h) => s + h.realizedPnl, 0)
  const totalUnrealizedPnl = totalValue - totalCost
  const dayChange = enriched.reduce((s, h) => s + h.dayChange, 0)
  const prevValue = totalValue - dayChange

  const summary: PortfolioSummary = {
    totalValue,
    totalCost,
    totalUnrealizedPnl,
    totalUnrealizedPnlPercent:
      totalCost > 0 ? (totalUnrealizedPnl / totalCost) * 100 : 0,
    totalRealizedPnl,
    dayChange,
    dayChangePercent: prevValue > 0 ? (dayChange / prevValue) * 100 : 0,
  }

  return { holdings: enriched, summary }
}
