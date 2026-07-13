import { prisma } from '../prisma'
// Import the provider directly (not from './index') to avoid a circular
// import — index.ts re-exports this module.
import { indicatorProvider as indicators } from './fmp'
import { mockIndicatorProvider } from './mock'
import { computeChartIndicators } from './calc'
import { computeG1G2 } from './financials'
import { computeG3 } from './g3-proxy'
import { computeKillFlags } from './kill-flags'
import { computeValuation } from './valuation'
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

  // 실제 벤더 호출이 비면(키 유효하나 API가 빈 응답/에러) mock으로 명시적으로
  // 폴백한다 — fmp.ts는 절대 내부에서 조용히 mock을 섞지 않는다(그러면 source가
  // 'fmp'인데 실제로는 mock인 상황이 생겨 디버깅 불가능해짐, 실제로 겪은 버그).
  let [bars, reports] = await Promise.all([
    indicators.getDailyBars(ticker),
    indicators.getQuarterlyReports(ticker),
  ])
  const barsSource: 'fmp' | 'mock' = indicators.name === 'fmp' && bars.length > 0 ? 'fmp' : 'mock'
  const reportsSource: 'fmp' | 'mock' =
    indicators.name === 'fmp' && reports.length > 0 ? 'fmp' : 'mock'
  if (bars.length === 0) {
    console.warn(`[indicators] ${ticker}: bars fallback to mock (vendor returned none)`)
    bars = await mockIndicatorProvider.getDailyBars(ticker)
  }
  if (reports.length === 0) {
    console.warn(`[indicators] ${ticker}: reports fallback to mock (vendor returned none)`)
    reports = await mockIndicatorProvider.getQuarterlyReports(ticker)
  }
  // 하나라도 mock으로 대체됐으면 전체 source를 'mock'으로 정직하게 표시한다.
  const source = barsSource === 'fmp' && reportsSource === 'fmp' ? 'fmp' : 'mock'

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
        source,
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

  // 밸류에이션 — 벤더가 주면 실데이터, 실패하면 mock으로 명시적 폴백(source는 위와 동일 규칙).
  let valuationRaw = await indicators.getValuation(ticker)
  if (!valuationRaw) {
    valuationRaw = await mockIndicatorProvider.getValuation(ticker)
  }
  const valuation = valuationRaw ? computeValuation(valuationRaw) : null

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
    evToSales: valuation?.evToSales ?? null,
    pe: valuation?.pe ?? null,
    evToSalesMedian5y: valuation?.evToSalesMedian5y ?? null,
    peMedian5y: valuation?.peMedian5y ?? null,
    valuationPreProfit: valuation?.preProfit ?? null,
    evToSalesVsMedianPct: valuation?.evToSalesVsMedianPct ?? null,
    peVsMedianPct: valuation?.peVsMedianPct ?? null,
    source,
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
