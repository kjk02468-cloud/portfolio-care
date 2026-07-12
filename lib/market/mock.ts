import type { MarketDataProvider, Quote } from './types'

// Deterministic pseudo price generator so the same symbol always yields a
// stable-ish quote across requests (with a small daily drift). This lets the
// whole app run without any external API key.
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function mockQuote(symbol: string): Quote {
  const sym = symbol.toUpperCase()
  const base = 20 + (hash(sym) % 480) // base price between $20 and $500
  // Drift that changes once per day but is stable within a day.
  const day = Math.floor(Date.now() / 86_400_000)
  const drift = ((hash(sym + day) % 2000) - 1000) / 10000 // -10% .. +10%
  const price = Math.round(base * (1 + drift) * 100) / 100
  const previousClose = Math.round(base * 100) / 100
  const change = Math.round((price - previousClose) * 100) / 100
  const changePercent =
    previousClose === 0 ? 0 : Math.round((change / previousClose) * 10000) / 100

  return {
    symbol: sym,
    price,
    previousClose,
    change,
    changePercent,
    currency: 'USD',
    source: 'mock',
  }
}

export const mockProvider: MarketDataProvider = {
  name: 'mock',
  async getQuote(symbol) {
    return mockQuote(symbol)
  },
  async getQuotes(symbols) {
    const out: Record<string, Quote> = {}
    for (const s of symbols) out[s.toUpperCase()] = mockQuote(s)
    return out
  },
}
