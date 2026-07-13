// G값 자동화 파이프라인의 데이터 계약. lib/market(실시간 시세)과는 별개 관심사 —
// 여기는 히스토리컬 가격(차트·G4)과 분기 재무(G2·G3 프록시)를 다룬다.

export interface PriceBar {
  date: string // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface QuarterlyReport {
  periodEnd: string // YYYY-MM-DD, 분기 종료일
  reportedAt: string | null // 실적 발표일. 없으면 null
  revenue: number | null
  grossProfit: number | null // G2(그로스마진 업종) 원천
  operatingIncome: number | null // G2(영업마진 업종) 원천
  epsActual: number | null
  epsEstimate: number | null // 컨센서스. 벤더가 못 주면 null → G3 프록시는 매출만으로 판단
  revenueEstimate: number | null
}

// 밸류에이션 원자료 스냅샷 (lib/indicators/valuation.ts에서 배수·중앙값 계산).
export interface ValuationSnapshotRaw {
  price: number | null
  marketCap: number | null
  enterpriseValue: number | null
  ttmRevenue: number | null
  ttmEps: number | null
  evToSalesHistory: number[]
  peHistory: number[]
}

export interface IndicatorProvider {
  readonly name: 'fmp' | 'mock'
  /** 최근 lookbackDays(기본 380 캘린더일 ≈ 52주+여유) 일봉, 날짜 오름차순. */
  getDailyBars(symbol: string, lookbackDays?: number): Promise<PriceBar[]>
  /** 최근 quarters개 분기 재무, periodEnd 오름차순(과거→최근). */
  getQuarterlyReports(symbol: string, quarters?: number): Promise<QuarterlyReport[]>
  /** 밸류에이션 원자료(EV·시총·TTM·과거 배수). 확보 불가면 null. */
  getValuation(symbol: string): Promise<ValuationSnapshotRaw | null>
}
