import type { IndicatorProvider, PriceBar, QuarterlyReport, ValuationSnapshotRaw } from './types'
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
  // path는 로그용 — apikey 쿼리 파라미터가 섞여 들어오지 않도록 별도로 받는다.
  async function fetchJson<T>(url: string, path: string): Promise<T | null> {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[fmp] ${path} → HTTP ${res.status}`, body.slice(0, 300))
        return null
      }
      return (await res.json()) as T
    } catch (err) {
      console.error(`[fmp] ${path} → fetch failed`, err)
      return null
    }
  }

  // 실패해도 여기서 mock으로 조용히 대체하지 않는다 — 그러면 source가 'fmp'인데
  // 실제로는 mock 데이터인 상황이 생겨 디버깅이 불가능해진다(실제로 겪은 버그).
  // 빈 배열을 그대로 반환하고, 폴백 여부·source 결정은 호출자(refresh.ts)가 한다.
  async function getDailyBars(symbol: string, lookbackDays = 380): Promise<PriceBar[]> {
    const sym = symbol.toUpperCase()
    const url = `${BASE}/historical-price-full/${encodeURIComponent(sym)}?timeseries=${lookbackDays}&apikey=${apiKey}`
    const data = await fetchJson<FmpHistoricalResponse>(url, `historical-price-full/${sym}`)
    const rows = data?.historical
    if (!rows || rows.length === 0) return []

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
        `income-statement/${sym}`,
      ),
      fetchJson<FmpEarningsSurprise[]>(
        `${BASE}/earnings-surprises/${encodeURIComponent(sym)}?apikey=${apiKey}`,
        `earnings-surprises/${sym}`,
      ),
    ])
    if (!income || income.length === 0) {
      return []
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

  // FMP key-metrics(period=quarter) 응답 중 사용 필드.
  interface FmpKeyMetrics {
    date: string
    enterpriseValue: number | null
    marketCap: number | null
    evToSales: number | null
    peRatio: number | null
  }
  interface FmpIncomeEps {
    date: string
    revenue: number | null
    eps: number | null
  }
  interface FmpQuoteShort {
    price: number | null
  }

  async function getValuation(symbol: string): Promise<ValuationSnapshotRaw | null> {
    const sym = symbol.toUpperCase()
    const [metrics, income, quote] = await Promise.all([
      fetchJson<FmpKeyMetrics[]>(
        `${BASE}/key-metrics/${encodeURIComponent(sym)}?period=quarter&limit=20&apikey=${apiKey}`,
        `key-metrics/${sym}`,
      ),
      fetchJson<FmpIncomeEps[]>(
        `${BASE}/income-statement/${encodeURIComponent(sym)}?period=quarter&limit=4&apikey=${apiKey}`,
        `income-statement(ttm)/${sym}`,
      ),
      fetchJson<FmpQuoteShort[]>(
        `${BASE}/quote-short/${encodeURIComponent(sym)}?apikey=${apiKey}`,
        `quote-short/${sym}`,
      ),
    ])
    // key-metrics가 비면 밸류에이션 판정 보류 — 지어내지 않는다.
    if (!metrics || metrics.length === 0) return null

    const ttmRevenue = income && income.length > 0
      ? income.reduce((a, r) => a + (r.revenue ?? 0), 0)
      : null
    const ttmEps = income && income.length > 0
      ? income.reduce((a, r) => a + (r.eps ?? 0), 0)
      : null

    return {
      price: quote?.[0]?.price ?? null,
      marketCap: metrics[0].marketCap ?? null,
      enterpriseValue: metrics[0].enterpriseValue ?? null,
      ttmRevenue,
      ttmEps,
      evToSalesHistory: metrics.map((m) => m.evToSales).filter((v): v is number => v !== null),
      peHistory: metrics.map((m) => m.peRatio).filter((v): v is number => v !== null),
    }
  }

  return { name: 'fmp', getDailyBars, getQuarterlyReports, getValuation }
}

// Choose the provider once at module load: real API when a key is present,
// otherwise the self-contained mock provider — same pattern as lib/market/finnhub.ts.
export const indicatorProvider: IndicatorProvider = process.env.FMP_API_KEY
  ? makeFmpProvider(process.env.FMP_API_KEY)
  : mockIndicatorProvider
