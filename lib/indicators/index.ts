import { indicatorProvider } from './fmp'

export type { PriceBar, QuarterlyReport, IndicatorProvider } from './types'
export * from './calc'
export * from './refresh'

/** Active indicator-data provider (FMP when FMP_API_KEY is set, else mock). */
export const indicators = indicatorProvider
