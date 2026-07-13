// 밸류에이션 자동화 (보고서 가이드 §가격·밸류에이션). 매뉴얼 원칙: 가격이 높다는
// 사실은 사업 가설의 부정이 아니다 — 밸류에이션은 단계 판정과 분리된 "가격 위험" 레이어.
// 여기서는 현재 배수(EV/Sales·P/E)와 5년(20분기) 중앙값을 비교해 과열/저평가를 표기만 한다.

export interface ValuationSnapshot {
  price: number | null
  marketCap: number | null
  enterpriseValue: number | null
  ttmRevenue: number | null // 최근 4분기 매출 합
  ttmEps: number | null // 최근 4분기 EPS 합 (음수면 흑자 전)
  // 과거 배수 시계열 (최대 20분기). 중앙값 계산용 — 순서 무관.
  evToSalesHistory: number[]
  peHistory: number[]
}

export interface ValuationResult {
  evToSales: number | null
  pe: number | null // 흑자 전이면 null (P/E 무의미)
  evToSalesMedian5y: number | null
  peMedian5y: number | null
  preProfit: boolean
  // (현재/중앙값 − 1)×100. 양수면 과거 대비 비쌈. 데이터 없으면 null.
  evToSalesVsMedianPct: number | null
  peVsMedianPct: number | null
}

/** 중앙값. 유한한 양수만 사용(음수 P/E·NaN 제외). 비면 null. */
export function median(xs: number[]): number | null {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid]
}

const vsPct = (cur: number | null, med: number | null): number | null =>
  cur !== null && med !== null && med > 0 ? (cur / med - 1) * 100 : null

/**
 * 스냅샷에서 배수와 5년 중앙값 대비 위치를 계산한다. 결정적 순수 함수 — 테스트 대상.
 * 배수는 스냅샷이 직접 주면 그 값을, 없으면 원자료(EV·매출·가격·EPS)로 유도한다.
 */
export function computeValuation(s: ValuationSnapshot): ValuationResult {
  const evToSales =
    s.enterpriseValue !== null && s.ttmRevenue !== null && s.ttmRevenue > 0
      ? s.enterpriseValue / s.ttmRevenue
      : null

  // 흑자 전(TTM EPS ≤ 0)은 P/E 무의미 — 매뉴얼·보고서 가이드대로 null 처리.
  const preProfit = s.ttmEps === null ? false : s.ttmEps <= 0
  const pe =
    !preProfit && s.price !== null && s.ttmEps !== null && s.ttmEps > 0
      ? s.price / s.ttmEps
      : null

  const evToSalesMedian5y = median(s.evToSalesHistory)
  const peMedian5y = median(s.peHistory)

  return {
    evToSales,
    pe,
    evToSalesMedian5y,
    peMedian5y,
    preProfit,
    evToSalesVsMedianPct: vsPct(evToSales, evToSalesMedian5y),
    peVsMedianPct: vsPct(pe, peMedian5y),
  }
}
