import type { QuarterlyReport } from './types'
import { computeRevenueYoY } from './financials'

// G3 무료 프록시(유료 컨센 리비전 피드 대체) — 합의된 정의:
// 매출·EPS 둘 다 서프라이즈 AND 매출 YoY 성장률이 전분기보다 가속 → G3=1, 아니면 G3=0.
// 흑자 전(pre-profit) 종목은 EPS 서프라이즈가 노이즈라 매출 서프라이즈+가속만 본다.
// §A.2의 G3s 감쇠(G3=1→+1, G3=0→−1)가 스무딩을 담당하므로 G3 자체엔 히스테리시스를
// 두지 않는다(§A.5는 G1/G2 임계 판정에만 해당).
const SURPRISE_THRESHOLD_PCT = 1 // 노이즈 컷 마진. 필요시 조정 가능

function computeSurprisePct(actual: number | null, estimate: number | null): number | null {
  if (actual === null || estimate === null || estimate === 0) return null
  return ((actual - estimate) / Math.abs(estimate)) * 100
}

/**
 * 3값 논리 AND — 하나라도 확실히 false면 false(단정 가능), 전부 true면 true,
 * 그 외(값 일부가 unknown이고 false는 없음)는 null(판정 보류). 컨센서스 일부
 * 필드가 없어도 다른 조건에서 이미 fail이 확정되면 억지로 보류하지 않는다.
 */
function and3(...vals: (boolean | null)[]): boolean | null {
  if (vals.some((v) => v === false)) return false
  if (vals.every((v) => v === true)) return true
  return null
}

export interface G3Result {
  revenueSurprisePct: number | null
  epsSurprisePct: number | null
  g3Suggested: 0 | 1 | null
}

/** reports는 periodEnd 오름차순(과거→최근) 가정. isPreProfit이면 EPS 서프라이즈 제외. */
export function computeG3(reports: QuarterlyReport[], isPreProfit: boolean): G3Result {
  const latest = reports.length - 1
  if (latest < 0) return { revenueSurprisePct: null, epsSurprisePct: null, g3Suggested: null }

  const latestReport = reports[latest]
  const revenueYoY = computeRevenueYoY(reports, latest)
  const revenueYoYPrev = latest - 1 >= 0 ? computeRevenueYoY(reports, latest - 1) : null

  const revenueSurprisePct = computeSurprisePct(latestReport.revenue, latestReport.revenueEstimate)
  const epsSurprisePct = computeSurprisePct(latestReport.epsActual, latestReport.epsEstimate)

  const accelerating: boolean | null =
    revenueYoY === null || revenueYoYPrev === null ? null : revenueYoY > revenueYoYPrev
  const revenueBeat: boolean | null =
    revenueSurprisePct === null ? null : revenueSurprisePct >= SURPRISE_THRESHOLD_PCT
  const epsBeat: boolean | null =
    epsSurprisePct === null ? null : epsSurprisePct >= SURPRISE_THRESHOLD_PCT

  const combined = isPreProfit
    ? and3(revenueBeat, accelerating)
    : and3(revenueBeat, epsBeat, accelerating)

  return {
    revenueSurprisePct,
    epsSurprisePct,
    g3Suggested: combined === null ? null : combined ? 1 : 0,
  }
}
