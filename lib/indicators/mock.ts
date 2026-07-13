import type { IndicatorProvider, PriceBar, QuarterlyReport } from './types'

// Same deterministic-hash approach as lib/market/mock.ts, kept local so the two
// mock layers (live quotes vs historical indicators) stay decoupled.
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Deterministic daily bars: a hash-seeded base price with a slow trend
 * (so 52-week-high/MA/ATR calculations have something realistic to chew on)
 * plus small daily noise. Weekends are skipped like real trading calendars.
 */
function mockBars(symbol: string, lookbackDays: number): PriceBar[] {
  const sym = symbol.toUpperCase()
  const base = 20 + (hash(sym) % 480)
  // Ticker-specific slow drift direction/magnitude over the lookback window.
  const trendPerDay = ((hash(sym + ':trend') % 200) - 100) / 100_000 // ~-0.1%..+0.1%/day

  const bars: PriceBar[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let price = base * (1 - trendPerDay * lookbackDays) // back-solve the start price
  for (let i = lookbackDays; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) continue // skip weekends

    const dateStr = toISODate(d)
    const noise = ((hash(sym + dateStr) % 400) - 200) / 10_000 // ~-2%..+2%
    price = Math.max(1, price * (1 + trendPerDay + noise))

    const open = price * (1 + ((hash(dateStr + 'o' + sym) % 100) - 50) / 10_000)
    const close = price
    const high = Math.max(open, close) * (1 + (hash(dateStr + 'h' + sym) % 60) / 10_000)
    const low = Math.min(open, close) * (1 - (hash(dateStr + 'l' + sym) % 60) / 10_000)
    const volBase = 200_000 + (hash(sym + ':vol') % 2_000_000)
    const volSpike = hash(sym + dateStr + 'v') % 100 < 8 ? 2.5 : 1 // occasional volume spike
    const volume = Math.round(volBase * volSpike * (0.7 + (hash(dateStr + 'v2' + sym) % 60) / 100))

    bars.push({
      date: dateStr,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    })
  }
  return bars
}

/**
 * Deterministic quarterly reports. Bucketing by hash decides whether this
 * ticker's mock "story" is accelerating-and-beating or decelerating-and-missing,
 * so downstream G3-proxy logic has both outcomes to exercise in tests.
 */
function mockQuarterlyReports(symbol: string, quarters: number): QuarterlyReport[] {
  const sym = symbol.toUpperCase()
  const baseRevenue = 50_000_000 + (hash(sym + ':rev') % 2_000_000_000)
  const accelerating = hash(sym + ':story') % 2 === 0
  const baseGrowth = accelerating ? 0.03 : 0.015 // quarterly growth, before drift

  // Margin levels span a wide range so different industry-profile thresholds
  // (e.g. memory_ip GM>=70%, EMS OPM>=5%) land on both sides for different tickers.
  const baseGrossMarginPct = 30 + (hash(sym + ':gm') % 50) // 30%..80%
  const baseOpMarginPct = -5 + (hash(sym + ':opm') % 30) // -5%..25%
  const marginDriftPerQuarter = accelerating ? 0.3 : -0.3 // pp/quarter, ties to the story

  const today = new Date()
  const reports: QuarterlyReport[] = []
  for (let i = quarters - 1; i >= 0; i--) {
    const periodEnd = new Date(today)
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() - i * 3, 0) // last day of that month
    const reportedAt = new Date(periodEnd)
    reportedAt.setUTCDate(reportedAt.getUTCDate() + 21) // ~3wk reporting lag

    // Accelerating story: growth rate itself rises each quarter. Decelerating: falls.
    const quarterIndex = quarters - 1 - i
    const growthDrift = accelerating ? quarterIndex * 0.002 : -quarterIndex * 0.0015
    const growth = baseGrowth + growthDrift
    const revenue = baseRevenue * Math.pow(1 + growth, quarterIndex)

    const revenueEstimate = revenue * (1 - ((hash(sym + i + 're') % 30) - 15) / 1000)
    const epsBase = 0.4 + (hash(sym + ':eps') % 300) / 100
    const epsActual = epsBase * (1 + growth * (accelerating ? 1.2 : 0.6))
    const epsEstimate = epsActual * (1 - ((hash(sym + i + 'ee') % 30) - 15) / 1000)

    const grossMarginPct = baseGrossMarginPct + marginDriftPerQuarter * quarterIndex
    const opMarginPct = baseOpMarginPct + marginDriftPerQuarter * quarterIndex
    const grossProfit = revenue * (grossMarginPct / 100)
    const operatingIncome = revenue * (opMarginPct / 100)

    reports.push({
      periodEnd: toISODate(periodEnd),
      reportedAt: toISODate(reportedAt),
      revenue: round2(revenue),
      grossProfit: round2(grossProfit),
      operatingIncome: round2(operatingIncome),
      epsActual: round2(epsActual),
      epsEstimate: round2(epsEstimate),
      revenueEstimate: round2(revenueEstimate),
    })
  }
  return reports
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export const mockIndicatorProvider: IndicatorProvider = {
  name: 'mock',
  async getDailyBars(symbol, lookbackDays = 380) {
    return mockBars(symbol, lookbackDays)
  },
  async getQuarterlyReports(symbol, quarters = 8) {
    return mockQuarterlyReports(symbol, quarters)
  },
}
