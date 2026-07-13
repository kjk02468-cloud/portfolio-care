import type { QuarterlyReport } from './types'
import { computeRevenueYoY, computeMarginPct } from './financials'
import { computeG3 } from './g3-proxy'
import type { IndustryProfile } from './industry-profiles'

export interface KillFlags {
  revenueDecline2q: boolean | null
  marginDecline2q: boolean | null
  guidanceCut2q: boolean | null
}

/**
 * 매뉴얼 킬 카테고리(수요 파괴·마진 악화·가이던스 컷) 중 캐시된 재무 데이터로
 * 확인 가능한 3가지 수치형 신호. 경쟁·인소싱·실행·희석 등 이벤트형은 벤더에서
 * 확보 불가 — 관리자가 직접 판단해야 한다(자동 플래그 없음).
 *
 * 중요: 이 3개는 "킬라인 판정"이 아니라 "확인해볼 신호"다. 매뉴얼 §A.6은 킬에
 * 종목별 AND 조건(질적 확인 포함)을 요구하므로, 이 플래그가 전부 true여도
 * Stock.kill을 자동으로 설정하지 않는다 — 관리자가 StockStagePanel에서 직접
 * 확인 후 체크한다.
 */
export function computeKillFlags(
  reports: QuarterlyReport[],
  profile: IndustryProfile | null,
  isPreProfit: boolean,
): KillFlags {
  const latest = reports.length - 1

  // 수요 파괴 proxy: 매출 YoY 2분기 연속 역성장(<0%)
  const yoyLatest = latest >= 0 ? computeRevenueYoY(reports, latest) : null
  const yoyPrev = latest - 1 >= 0 ? computeRevenueYoY(reports, latest - 1) : null
  const revenueDecline2q =
    yoyLatest === null || yoyPrev === null ? null : yoyLatest < 0 && yoyPrev < 0

  // 마진 악화 proxy: 마진 3분기 연속 하락(=2분기 연속 악화). 프로필의 G2 지표가
  // 임계형(그로스/영업마진)이면 그걸 쓰고, 아니면(추세형·미지정) 영업마진으로 대체
  // — 이 플래그는 참고용이라 G1/G2 판정보다 대체를 허용한다.
  const metric: 'grossMargin' | 'operatingMargin' =
    profile?.g2.metric === 'grossMargin' ? 'grossMargin' : 'operatingMargin'
  function marginAt(idx: number): number | null {
    if (idx < 0 || idx >= reports.length) return null
    const r = reports[idx]
    return metric === 'grossMargin'
      ? computeMarginPct(r.grossProfit, r.revenue)
      : computeMarginPct(r.operatingIncome, r.revenue)
  }
  const m0 = marginAt(latest) // 최근 분기
  const m1 = marginAt(latest - 1)
  const m2 = marginAt(latest - 2)
  const marginDecline2q =
    m0 === null || m1 === null || m2 === null ? null : m0 < m1 && m1 < m2

  // 가이던스 컷 proxy: G3 프록시가 2분기 연속 0(서프라이즈 없음 또는 가속 없음).
  // 각 시점의 "그 분기까지의" 데이터만으로 재계산(과거 시점 재현).
  const g3Latest = latest >= 0 ? computeG3(reports.slice(0, latest + 1), isPreProfit) : null
  const g3Prev = latest - 1 >= 0 ? computeG3(reports.slice(0, latest), isPreProfit) : null
  const guidanceCut2q =
    g3Latest === null ||
    g3Prev === null ||
    g3Latest.g3Suggested === null ||
    g3Prev.g3Suggested === null
      ? null
      : g3Latest.g3Suggested === 0 && g3Prev.g3Suggested === 0

  return { revenueDecline2q, marginDecline2q, guidanceCut2q }
}
