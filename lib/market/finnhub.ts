import type { MarketDataProvider, Quote } from './types'
import { mockProvider } from './mock'

const BASE = 'https://finnhub.io/api/v1'

// Finnhub /quote response shape (fields we use).
interface FinnhubQuote {
  c: number // current price
  pc: number // previous close
  d: number | null // change
  dp: number | null // percent change
}

function makeFinnhubProvider(apiKey: string): MarketDataProvider {
  async function fetchOne(symbol: string): Promise<Quote | null> {
    const sym = symbol.toUpperCase()
    try {
      const res = await fetch(
        `${BASE}/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`,
        { next: { revalidate: 30 } },
      )
      if (!res.ok) return mockProvider.getQuote(sym)
      const data = (await res.json()) as FinnhubQuote
      // Finnhub returns c=0 for unknown symbols; fall back to mock in that case.
      if (!data || !data.c) return mockProvider.getQuote(sym)
      const price = data.c
      const previousClose = data.pc || price
      const change = data.d ?? price - previousClose
      const changePercent =
        data.dp ?? (previousClose ? (change / previousClose) * 100 : 0)
      return {
        symbol: sym,
        price,
        previousClose,
        change,
        changePercent,
        currency: 'USD',
        source: 'finnhub',
      }
    } catch {
      // Network/proxy failure — degrade gracefully to mock data.
      return mockProvider.getQuote(sym)
    }
  }

  return {
    name: 'finnhub',
    getQuote: fetchOne,
    async getQuotes(symbols) {
      const out: Record<string, Quote> = {}
      const results = await Promise.all(symbols.map((s) => fetchOne(s)))
      symbols.forEach((s, i) => {
        const q = results[i]
        if (q) out[s.toUpperCase()] = q
      })
      return out
    },
  }
}

// Choose the provider once at module load: real API when a key is present,
// otherwise the self-contained mock provider.
export const marketProvider: MarketDataProvider = process.env.FINNHUB_API_KEY
  ? makeFinnhubProvider(process.env.FINNHUB_API_KEY)
  : mockProvider
