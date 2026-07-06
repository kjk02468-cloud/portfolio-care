import { prisma } from './prisma'
import { getQuotes } from './market'
import {
  computeHoldings,
  enrichHoldings,
  type EnrichedHolding,
  type PortfolioSummary,
} from './portfolio'

export interface PortfolioView {
  id: string
  name: string
  baseCurrency: string
  holdings: EnrichedHolding[]
  summary: PortfolioSummary
  transactionCount: number
}

export interface DashboardData {
  portfolios: PortfolioView[]
  holdings: EnrichedHolding[]
  summary: PortfolioSummary
  trend: { date: string; value: number; cost: number }[]
  usingLiveData: boolean
}

/** Aggregate every portfolio the user owns into a single dashboard view. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      transactions: true,
      snapshots: { orderBy: { takenAt: 'asc' } },
    },
  })

  // Gather every symbol across all portfolios and fetch quotes once.
  const holdingsByPortfolio = portfolios.map((p) => ({
    portfolio: p,
    baseHoldings: computeHoldings(p.transactions),
  }))
  const allSymbols = holdingsByPortfolio.flatMap((h) =>
    h.baseHoldings.map((b) => b.symbol),
  )
  const quotes = allSymbols.length ? await getQuotes(allSymbols) : {}

  const portfolioViews: PortfolioView[] = holdingsByPortfolio.map(
    ({ portfolio, baseHoldings }) => {
      const { holdings, summary } = enrichHoldings(baseHoldings, quotes)
      return {
        id: portfolio.id,
        name: portfolio.name,
        baseCurrency: portfolio.baseCurrency,
        holdings,
        summary,
        transactionCount: portfolio.transactions.length,
      }
    },
  )

  // Combine holdings of the same symbol across portfolios for the top-level view.
  const combinedBase = computeHoldings(
    portfolios.flatMap((p) => p.transactions),
  )
  const { holdings, summary } = enrichHoldings(combinedBase, quotes)

  // Build a value-over-time trend by summing snapshots per day across portfolios.
  const trendMap = new Map<string, { value: number; cost: number }>()
  for (const p of portfolios) {
    for (const s of p.snapshots) {
      const day = s.takenAt.toISOString().slice(0, 10)
      const cur = trendMap.get(day) ?? { value: 0, cost: 0 }
      cur.value += s.totalValue
      cur.cost += s.totalCost
      trendMap.set(day, cur)
    }
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, value: v.value, cost: v.cost }))

  const usingLiveData = Object.values(quotes).some((q) => q.source === 'finnhub')

  return { portfolios: portfolioViews, holdings, summary, trend, usingLiveData }
}

export async function getPortfolioView(
  portfolioId: string,
  userId: string,
): Promise<{ view: PortfolioView; transactions: PortfolioTx[] } | null> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
    include: { transactions: { orderBy: { tradedAt: 'desc' } } },
  })
  if (!portfolio) return null

  const baseHoldings = computeHoldings(portfolio.transactions)
  const symbols = baseHoldings.map((b) => b.symbol)
  const quotes = symbols.length ? await getQuotes(symbols) : {}
  const { holdings, summary } = enrichHoldings(baseHoldings, quotes)

  return {
    view: {
      id: portfolio.id,
      name: portfolio.name,
      baseCurrency: portfolio.baseCurrency,
      holdings,
      summary,
      transactionCount: portfolio.transactions.length,
    },
    transactions: portfolio.transactions.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      tradedAt: t.tradedAt.toISOString(),
    })),
  }
}

export interface PortfolioTx {
  id: string
  symbol: string
  name: string | null
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  fee: number
  tradedAt: string
}
