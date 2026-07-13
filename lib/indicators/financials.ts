import type { QuarterlyReport } from './types'
import {
  applyHysteresis,
  applyTrendHysteresis,
  type IndustryProfile,
} from './industry-profiles'

// 이 파일의 *Pct 값은 전부 "퍼센트 숫자"(예: 32.5 = 32.5%) 단위다 — industry-profiles.ts의
// *ThresholdPct와 같은 단위. (calc.ts의 drawdownPct만 예외로 분수 단위 — 매뉴얼 §A.3
// 원문 공식을 그대로 옮긴 것이라 그쪽은 바꾸지 않는다.)

/** reports는 periodEnd 오름차순(과거→최근) 가정. idx의 전년동기 대비 매출 성장률(%). */
export function computeRevenueYoY(reports: QuarterlyReport[], idx: number): number | null {
  if (idx < 4 || idx >= reports.length) return null
  const cur = reports[idx].revenue
  const prior = reports[idx - 4].revenue
  if (cur === null || prior === null || prior === 0) return null
  return ((cur - prior) / Math.abs(prior)) * 100
}

/** numerator/revenue를 퍼센트로. 그로스마진 = grossProfit/revenue, 영업마진 = operatingIncome/revenue. */
export function computeMarginPct(numerator: number | null, revenue: number | null): number | null {
  if (numerator === null || revenue === null || revenue === 0) return null
  return (numerator / revenue) * 100
}

export interface G1G2Result {
  revenueYoY: number | null
  revenueYoYPrev: number | null
  grossMarginPct: number | null
  operatingMarginPct: number | null
  g1Suggested: 0 | 1 | null
  g2Suggested: 0 | 1 | null
}

/**
 * 최신 분기 기준 G1(수요)·G2(수익성) 제안값. profile이 null이면(업종 미지정)
 * 항상 판정 보류 — 근거 없이 일반 임계값을 추정하지 않는다.
 */
export function computeG1G2(
  reports: QuarterlyReport[],
  profile: IndustryProfile | null,
  prevConfirmedG1: 0 | 1 | null,
  prevConfirmedG2: 0 | 1 | null,
): G1G2Result {
  const latest = reports.length - 1
  const revenueYoY = latest >= 0 ? computeRevenueYoY(reports, latest) : null
  const revenueYoYPrev = latest - 1 >= 0 ? computeRevenueYoY(reports, latest - 1) : null

  const latestReport = latest >= 0 ? reports[latest] : null
  const grossMarginPct = latestReport
    ? computeMarginPct(latestReport.grossProfit, latestReport.revenue)
    : null
  const operatingMarginPct = latestReport
    ? computeMarginPct(latestReport.operatingIncome, latestReport.revenue)
    : null
  const prevOperatingMarginPct =
    latest - 1 >= 0
      ? computeMarginPct(reports[latest - 1].operatingIncome, reports[latest - 1].revenue)
      : null
  const epsActual = latestReport?.epsActual ?? null
  const epsActualPrev = latest - 1 >= 0 ? reports[latest - 1].epsActual : null

  if (!profile) {
    return {
      revenueYoY,
      revenueYoYPrev,
      grossMarginPct,
      operatingMarginPct,
      g1Suggested: null,
      g2Suggested: null,
    }
  }

  const g1Suggested = applyHysteresis(revenueYoY, profile.g1.revenueYoYThresholdPct, prevConfirmedG1)

  let g2Suggested: 0 | 1 | null
  if (profile.g2.metric === 'grossMargin') {
    g2Suggested = applyHysteresis(grossMarginPct, profile.g2.thresholdPct, prevConfirmedG2)
  } else if (profile.g2.metric === 'operatingMargin') {
    g2Suggested = applyHysteresis(operatingMarginPct, profile.g2.thresholdPct, prevConfirmedG2)
  } else if (profile.g2.metric === 'operatingMarginImproving') {
    // 0.01 기본 밴드는 EPS($) 스케일용 — 마진(%) 스케일은 0.5%p 밴드로.
    g2Suggested = applyTrendHysteresis(operatingMarginPct, prevOperatingMarginPct, prevConfirmedG2, 0.5)
  } else if (profile.g2.metric === 'epsImproving') {
    g2Suggested = applyTrendHysteresis(epsActual, epsActualPrev, prevConfirmedG2)
  } else {
    g2Suggested = null
  }

  return { revenueYoY, revenueYoYPrev, grossMarginPct, operatingMarginPct, g1Suggested, g2Suggested }
}
