import { marketProvider } from './finnhub'

export type { Quote, MarketDataProvider } from './types'

/** Active market-data provider (Finnhub when FINNHUB_API_KEY is set, else mock). */
export const market = marketProvider

export function getQuotes(symbols: string[]) {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase())))
  return market.getQuotes(unique)
}
