import { prisma } from '../prisma'
// Import the provider directly (not from './index') to avoid a circular
// import — index.ts re-exports this module.
import { indicatorProvider as indicators } from './fmp'
import { computeChartIndicators } from './calc'

export interface RefreshResult {
  stockId: string
  ticker: string
  barsStored: number
  indicatorComputed: boolean
}

/**
 * Fetches daily bars for one stock, replaces its price-bar cache wholesale
 * (the cache mirrors the vendor's lookback window, so a diff isn't needed),
 * then recomputes and upserts the G4/chart fields on StockAutoIndicator.
 * G3 fields are left untouched — the quarterly-financials refresh (Phase D)
 * owns those.
 */
export async function refreshStockIndicator(
  stockId: string,
  ticker: string,
): Promise<RefreshResult> {
  const bars = await indicators.getDailyBars(ticker)

  await prisma.$transaction([
    prisma.stockPriceBar.deleteMany({ where: { stockId } }),
    prisma.stockPriceBar.createMany({
      data: bars.map((b) => ({
        stockId,
        date: new Date(b.date),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      })),
    }),
  ])

  const chart = computeChartIndicators(bars)
  if (!chart) {
    return { stockId, ticker, barsStored: bars.length, indicatorComputed: false }
  }

  const chartFields = {
    asOf: new Date(bars[bars.length - 1].date),
    price: chart.price,
    high52w: chart.high52w,
    drawdownPct: chart.drawdownPct,
    ma50: chart.ma50,
    ma200: chart.ma200,
    atr14: chart.atr14,
    volAvgRatio: chart.volAvgRatio,
    g4Suggested: chart.g4Suggested,
    source: indicators.name,
  }
  await prisma.stockAutoIndicator.upsert({
    where: { stockId },
    create: { stockId, ...chartFields },
    update: chartFields,
  })

  return { stockId, ticker, barsStored: bars.length, indicatorComputed: true }
}

/** Sequential (not parallel) to stay gentle on the vendor's rate limit. */
export async function refreshAllStockIndicators(): Promise<RefreshResult[]> {
  const stocks = await prisma.stock.findMany({ select: { id: true, ticker: true } })
  const results: RefreshResult[] = []
  for (const s of stocks) {
    results.push(await refreshStockIndicator(s.id, s.ticker))
  }
  return results
}
