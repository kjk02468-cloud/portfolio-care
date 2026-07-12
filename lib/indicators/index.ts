import { indicatorProvider } from './fmp'

export type { PriceBar, QuarterlyReport, IndicatorProvider } from './types'

/** Active indicator-data provider (FMP when FMP_API_KEY is set, else mock). */
export const indicators = indicatorProvider
