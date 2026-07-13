import { describe, it, expect } from 'vitest'
import { computeG3 } from './g3-proxy'
import type { QuarterlyReport } from './types'

function mk(revenue: number, revEst: number | null, eps: number | null, epsEst: number | null): QuarterlyReport {
  return {
    periodEnd: 'x',
    reportedAt: null,
    revenue,
    grossProfit: null,
    operatingIncome: null,
    epsActual: eps,
    epsEstimate: epsEst,
    revenueEstimate: revEst,
  }
}

// 6분기 필요: 최신(idx5)과 직전(idx4) 둘 다 YoY 계산 가능해야 가속 판정.
const accel = [
  mk(100, 100, 1.0, 1.0),
  mk(100, 100, 1.0, 1.0),
  mk(100, 100, 1.0, 1.0),
  mk(100, 100, 1.0, 1.0),
  mk(105, 103, 1.05, 1.0), // idx4: YoY +5%, 서프
  mk(115, 110, 1.15, 1.1), // idx5: YoY +15%(가속), 서프
]

describe('computeG3 무료 프록시 (서프라이즈 + 매출 가속)', () => {
  it('매출·EPS 서프 + 가속 → G3=1', () => {
    expect(computeG3(accel, false).g3Suggested).toBe(1)
  })

  it('EPS 미스 단독으로도 0 단정 (매출 서프 불명이어도)', () => {
    const q = [...accel.slice(0, 5), mk(115, null, 0.9, 1.1)] // eps 명확 미스
    expect(computeG3(q, false).g3Suggested).toBe(0)
  })

  it('전부 불명(컨센 없음·가속 판정 불가) → null(판정 보류)', () => {
    const q = [...accel.slice(0, 5), mk(115, null, null, null)]
    expect(computeG3(q, false).g3Suggested).toBeNull()
  })

  it('감속이면 서프라이즈 있어도 0', () => {
    const decel = [
      mk(100, 100, 1, 1),
      mk(100, 100, 1, 1),
      mk(100, 100, 1, 1),
      mk(100, 100, 1, 1),
      mk(120, 110, 1.2, 1.1), // idx4 YoY +20%
      mk(108, 103, 1.08, 1.0), // idx5 YoY +8% (감속)
    ]
    expect(computeG3(decel, false).g3Suggested).toBe(0)
  })

  it('pre-profit은 EPS 무시 — EPS 폭망해도 매출 서프+가속이면 1', () => {
    const q = [...accel.slice(0, 5), mk(115, 110, -5.0, 1.0)]
    expect(computeG3(q, true).g3Suggested).toBe(1)
    expect(computeG3(q, false).g3Suggested).toBe(0) // 일반은 EPS 미스로 0
  })

  it('컨센 없고 가속도 계산 불가 → null(판정 보류)', () => {
    // 컨센서스(estimate) null이면 서프라이즈 불명, 3분기뿐이라 가속도 불명 → null
    const noConsensus = [mk(100, null, 1, null), mk(100, null, 1, null), mk(100, null, 1, null)]
    expect(computeG3(noConsensus, false).g3Suggested).toBeNull()
    expect(computeG3([], false).g3Suggested).toBeNull()
  })
})
