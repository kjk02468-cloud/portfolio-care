import type { IndicatorProvider, PriceBar, QuarterlyReport } from './types'
import { mockIndicatorProvider } from './mock'

const BASE = 'https://financialmodelingprep.com/api/v3'

// FMP historical-price-full response shape (fields we use). Returned newest-first.
interface FmpHistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}
interface FmpHistoricalResponse {
  historical?: FmpHistoricalPrice[]
}

// FMP income-statement (period=quarter) response shape (fields we use).
interface FmpIncomeStatement {
  date: string // period end
  revenue: number
  grossProfit: number | null
  operatingIncome: number | null
}

// FMP earnings-surprises response shape (fields we use).
interface FmpEarningsSurprise {
  date: string // period end (approx — FMP ties this to the report date)
  actualEarningResult: number | null
  estimatedEarning: number | null
}

function makeFmpProvider(apiKey: string): IndicatorProvider {
  async function fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      return null
    }
  }

  async function getDailyBars(symbol: string, lookbackDays = 380): Promise<PriceBar[]> {
    const sym = symbol.toUpperCase()
    const url = `${BASE}/historical-price-full/${encodeURIComponent(sym)}?timeseries=${lookbackDays}&apikey=${apiKey}`
    const data = await fetchJson<FmpHistoricalResponse>(url)
    const rows = data?.historical
    if (!rows || rows.length === 0) return mockIndicatorProvider.getDailyBars(sym, lookbackDays)

    // FMP returns newest-first; the provider contract is ascending (oldest-first).
    return rows
      .map((r) => ({
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }))
      .reverse()
  }

  async function getQuarterlyReports(symbol: string, quarters = 8): Promise<QuarterlyReport[]> {
    const sym = symbol.toUpperCase()
    const [income, surprises] = await Promise.all([
      fetchJson<FmpIncomeStatement[]>(
        `${BASE}/income-statement/${encodeURIComponent(sym)}?period=quarter&limit=${quarters}&apikey=${apiKey}`,
      ),
      fetchJson<FmpEarningsSurprise[]>(
        `${BASE}/earnings-surprises/${encodeURIComponent(sym)}?apikey=${apiKey}`,
      ),
    ])
    if (!income || income.length === 0) {
      return mockIndicatorProvider.getQuarterlyReports(sym, quarters)
    }

    // Match each income-statement quarter to the nearest earnings-surprise entry
    // by date (FMP doesn't guarantee identical period-end dates between the two).
    const surpriseList = surprises ?? []
    function nearestSurprise(periodEnd: string): FmpEarningsSurprise | undefined {
      const target = new Date(periodEnd).getTime()
      let best: FmpEarningsSurprise | undefined
      let bestDiff = Infinity
      for (const s of surpriseList) {
        const diff = Math.abs(new Date(s.date).getTime() - target)
        if (diff < bestDiff) {
          bestDiff = diff
          best = s
        }
      }
      // Ignore matches more than ~45 days apart — not the same quarter.
      return bestDiff <= 45 * 86_400_000 ? best : undefined
    }

    // income-statement is newest-first; contract wants ascending.
    return income
      .slice(0, quarters)
      .map((r) => {
        const s = nearestSurprise(r.date)
        return {
          periodEnd: r.date,
          reportedAt: s?.date ?? null,
          revenue: r.revenue ?? null,
          grossProfit: r.grossProfit ?? null,
          operatingIncome: r.operatingIncome ?? null,
          epsActual: s?.actualEarningResult ?? null,
          epsEstimate: s?.estimatedEarning ?? null,
          // FMP's free-tier earnings-surprises endpoint doesn't carry a revenue
          // consensus figure; leave null so the G3 proxy falls back to
          // revenue-YoY-acceleration only (documented behavior, see report guide).
          revenueEstimate: null,
        }
      })
      .reverse()
  }

  return { name: 'fmp', getDailyBars, getQuarterlyReports }
}

// Choose the provider once at module load: real API when a key is present,
// otherwise the self-contained mock provider — same pattern as lib/market/finnhub.ts.
export const indicatorProvider: IndicatorProvider = process.env.FMP_API_KEY
  ? makeFmpProvider(process.env.FMP_API_KEY)
  : mockIndicatorProvider
