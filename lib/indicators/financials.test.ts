import { describe, it, expect } from 'vitest'
import { computeRevenueYoY, computeMarginPct, computeG1G2 } from './financials'
import { applyHysteresis, applyTrendHysteresis, INDUSTRY_PROFILES } from './industry-profiles'
import type { QuarterlyReport } from './types'

function mk(revenue: number, gp: number | null, oi: number | null, eps: number | null): QuarterlyReport {
  return {
    periodEnd: 'x',
    reportedAt: null,
    revenue,
    grossProfit: gp,
    operatingIncome: oi,
    epsActual: eps,
    epsEstimate: eps,
    revenueEstimate: null,
  }
}

describe('computeRevenueYoY', () => {
  const r: QuarterlyReport[] = [100, 110, 120, 130, 130].map((v) => mk(v, null, null, null))
  it('idx4 vs idx0 = +30%', () => {
    expect(computeRevenueYoY(r, 4)).toBeCloseTo(30)
  })
  it('idx<4는 전년동기 없음 → null', () => {
    expect(computeRevenueYoY(r, 3)).toBeNull()
  })
})

describe('computeMarginPct', () => {
  it('30/100 = 30%', () => expect(computeMarginPct(30, 100)).toBe(30))
  it('revenue 0/null → null', () => {
    expect(computeMarginPct(30, 0)).toBeNull()
    expect(computeMarginPct(30, null)).toBeNull()
  })
})

describe('applyHysteresis (§A.5)', () => {
  it('임계 이상 → 통과(1)', () => expect(applyHysteresis(30, 30, 0)).toBe(1))
  it('임계−1%p 미만 → 미통과(0)', () => expect(applyHysteresis(28.9, 30, 1)).toBe(0))
  it('밴드 내 + 직전 확정 있으면 유지', () => expect(applyHysteresis(29.5, 30, 1)).toBe(1))
  it('밴드 내 + 직전 없으면 판정 보류(null)', () => expect(applyHysteresis(29.5, 30, null)).toBeNull())
  it('임계 null이면 항상 판정 보류', () => expect(applyHysteresis(50, null, 1)).toBeNull())
  it('값 null이면 판정 보류', () => expect(applyHysteresis(null, 30, 1)).toBeNull())
})

describe('applyTrendHysteresis', () => {
  it('밴드 초과 상승 → 1', () => expect(applyTrendHysteresis(10, 9, 0, 0.5)).toBe(1))
  it('밴드 초과 하락 → 0', () => expect(applyTrendHysteresis(9, 10, 1, 0.5)).toBe(0))
  it('밴드 내 → 직전 유지', () => expect(applyTrendHysteresis(10, 10.2, 1, 0.5)).toBe(1))
})

describe('computeG1G2 — 프로필 없으면 항상 판정 보류(지어내지 않음)', () => {
  const reports = [100, 100, 100, 100, 130].map((v) => mk(v, v * 0.6, v * 0.1, 1))
  it('profile=null → g1/g2 모두 null', () => {
    const r = computeG1G2(reports, null, null, null)
    expect(r.g1Suggested).toBeNull()
    expect(r.g2Suggested).toBeNull()
  })
  it('자동 제안 없는 프로필(semiconductor)도 판정 보류', () => {
    const r = computeG1G2(reports, INDUSTRY_PROFILES.semiconductor, 1, 1)
    expect(r.g1Suggested).toBeNull()
    expect(r.g2Suggested).toBeNull()
  })
})

describe('computeG1G2 — 리서치 근거 프로필 (실측 마진 수준)', () => {
  // 6분기, 최신 GM=gm, 최신 매출YoY≈yoy
  function build(gm: number, yoy: number): QuarterlyReport[] {
    const base = 100
    const rows = [base, base * 1.02, base * 1.04, base * 1.06, base * 1.08, base * (1 + yoy / 100)]
    return rows.map((rev) => mk(rev, rev * (gm / 100), rev * 0.1, 1))
  }
  it('connectivity_fabless: CRDO형(GM68·+157%) → G1·G2 통과', () => {
    const r = computeG1G2(build(68, 157), INDUSTRY_PROFILES.connectivity_fabless, null, null)
    expect(r.g1Suggested).toBe(1)
    expect(r.g2Suggested).toBe(1)
  })
  it('connectivity_fabless: GM 55%(<60 임계) → G2 미통과', () => {
    const r = computeG1G2(build(55, 100), INDUSTRY_PROFILES.connectivity_fabless, null, null)
    expect(r.g2Suggested).toBe(0)
  })
  it('optical_hardware: AAOI형 GM 30%(경계) → G2 통과(≥30)', () => {
    const r = computeG1G2(build(30, 42), INDUSTRY_PROFILES.optical_hardware, null, null)
    expect(r.g2Suggested).toBe(1)
  })
  it('optical_hardware: GM 26%(명확 미달) → G2 미통과', () => {
    const r = computeG1G2(build(26, 42), INDUSTRY_PROFILES.optical_hardware, null, null)
    expect(r.g2Suggested).toBe(0)
  })
  it('optical_hardware: 성장 15%(<20 임계) → G1 미통과', () => {
    const r = computeG1G2(build(35, 15), INDUSTRY_PROFILES.optical_hardware, null, null)
    expect(r.g1Suggested).toBe(0)
  })
})
