export interface Quote {
  symbol: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  /** Where the quote came from, useful for showing a "demo data" badge in the UI. */
  source: 'finnhub' | 'mock'
}

export interface MarketDataProvider {
  readonly name: 'finnhub' | 'mock'
  getQuote(symbol: string): Promise<Quote | null>
  getQuotes(symbols: string[]): Promise<Record<string, Quote>>
}
