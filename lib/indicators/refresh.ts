import { prisma } from '../prisma'
// Import the provider directly (not from './index') to avoid a circular
// import — index.ts re-exports this module.
import { indicatorProvider as indicators } from './fmp'
import { computeChartIndicators } from './calc'
import { computeG1G2 } from './financials'
import { computeG3 } from './g3-proxy'
import { computeKillFlags } from './kill-flags'
import { INDUSTRY_PROFILES, type IndustryProfileKey } from './industry-profiles'

export interface RefreshResult {
  stockId: string
  ticker: string
  barsStored: number
  reportsStored: number
  indicatorComputed: boolean
}

function isProfileKey(v: string | null): v is IndustryProfileKey {
  return v !== null && v in INDUSTRY_PROFILES
}

/**
 * Fetches daily bars + quarterly financials for one stock, replaces both
 * caches wholesale (they mirror the vendor's window, so no diff is needed),
 * then recomputes and upserts G4/chart + G1/G2/G3 suggestions onto
 * StockAutoIndicator. Confirmed G values (Stock.g1/g2/g3s) are read-only
 * here — used only as the §A.5 hysteresis "previous" reference for G1/G2 —
 * this function never writes them. G3 has no hysteresis of its own (§A.2's
 * G3s decay is the smoothing mechanism), so it's a clean per-quarter signal.
 */
export async function refreshStockIndicator(
  stockId: string,
  ticker: string,
): Promise<RefreshResult> {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    select: { g1: true, g2: true, industryProfile: true },
  })

  const [bars, reports] = await Promise.all([
    indicators.getDailyBars(ticker),
    indicators.getQuarterlyReports(ticker),
  ])

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
    prisma.stockQuarterlyReport.deleteMany({ where: { stockId } }),
    prisma.stockQuarterlyReport.createMany({
      data: reports.map((r) => ({
        stockId,
        periodEnd: new Date(r.periodEnd),
        reportedAt: r.reportedAt ? new Date(r.reportedAt) : null,
        revenue: r.revenue,
        grossProfit: r.grossProfit,
        operatingIncome: r.operatingIncome,
        epsActual: r.epsActual,
        epsEstimate: r.epsEstimate,
        revenueEstimate: r.revenueEstimate,
        source: indicators.name,
      })),
    }),
  ])

  const chart = computeChartIndicators(bars)
  const profile = isProfileKey(stock?.industryProfile ?? null)
    ? INDUSTRY_PROFILES[stock!.industryProfile as IndustryProfileKey]
    : null
  // DB values are plain nullable ints; narrow to the strict 0|1 the manual's
  // G values are defined over (same boundary pattern as lib/stage-judge.ts).
  const toG = (v: number | null | undefined): 0 | 1 | null =>
    v === null || v === undefined ? null : v === 1 ? 1 : 0
  const g1g2 = computeG1G2(reports, profile, toG(stock?.g1), toG(stock?.g2))
  const isPreProfit = stock?.industryProfile === 'pre_profit'
  const g3 = computeG3(reports, isPreProfit)
  const killFlags = computeKillFlags(reports, profile, isPreProfit)

  if (!chart) {
    return {
      stockId,
      ticker,
      barsStored: bars.length,
      reportsStored: reports.length,
      indicatorComputed: false,
    }
  }

  const fields = {
    asOf: new Date(bars[bars.length - 1].date),
    price: chart.price,
    high52w: chart.high52w,
    drawdownPct: chart.drawdownPct,
    ma50: chart.ma50,
    ma200: chart.ma200,
    atr14: chart.atr14,
    volAvgRatio: chart.volAvgRatio,
    g4Suggested: chart.g4Suggested,
    revenueYoY: g1g2.revenueYoY,
    revenueYoYPrev: g1g2.revenueYoYPrev,
    grossMarginPct: g1g2.grossMarginPct,
    operatingMarginPct: g1g2.operatingMarginPct,
    g1Suggested: g1g2.g1Suggested,
    g2Suggested: g1g2.g2Suggested,
    epsSurprisePct: g3.epsSurprisePct,
    revenueSurprisePct: g3.revenueSurprisePct,
    g3Suggested: g3.g3Suggested,
    killRevenueDecline2q: killFlags.revenueDecline2q,
    killMarginDecline2q: killFlags.marginDecline2q,
    killGuidanceCut2q: killFlags.guidanceCut2q,
    source: indicators.name,
  }
  await prisma.stockAutoIndicator.upsert({
    where: { stockId },
    create: { stockId, ...fields },
    update: fields,
  })

  return {
    stockId,
    ticker,
    barsStored: bars.length,
    reportsStored: reports.length,
    indicatorComputed: true,
  }
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
