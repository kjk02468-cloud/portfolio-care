import { describe, it, expect } from 'vitest'
import { computeDrawdown, computeMovingAverage, computeChartIndicators } from './calc'
import type { PriceBar } from './types'

function bar(close: number, high = close, low = close): PriceBar {
  return { date: '2026-01-01', open: close, high, low, close, volume: 1000 }
}

describe('computeDrawdown / G4 (§A.3)', () => {
  it('정확히 20% 낙폭 → G4=0 (경계는 >20% 여유, 20%는 과열)', () => {
    const bars = [bar(100), bar(100), bar(80)]
    const d = computeDrawdown(bars)!
    expect(d.drawdownPct).toBeCloseTo(0.2)
    expect(d.g4Suggested).toBe(0)
  })
  it('20% 초과 낙폭 → G4=1 (여유)', () => {
    const bars = [bar(100), bar(100), bar(79)]
    expect(computeDrawdown(bars)!.g4Suggested).toBe(1)
  })
  it('빈 배열 → null', () => {
    expect(computeDrawdown([])).toBeNull()
  })
})

describe('computeMovingAverage', () => {
  it('데이터가 기간보다 짧으면 null(판정 보류)', () => {
    expect(computeMovingAverage([bar(1), bar(2)], 50)).toBeNull()
  })
  it('충분하면 종가 평균', () => {
    const bars = Array.from({ length: 5 }, (_, i) => bar(i + 1))
    expect(computeMovingAverage(bars, 5)).toBe(3)
  })
})

describe('computeChartIndicators', () => {
  it('빈 배열 → null, 크래시 없음', () => {
    expect(computeChartIndicators([])).toBeNull()
  })
  it('60개만 있으면 MA200은 null이지만 나머지는 계산', () => {
    const bars = Array.from({ length: 60 }, (_, i) => bar(100 + i))
    const r = computeChartIndicators(bars)!
    expect(r.ma200).toBeNull()
    expect(r.ma50).not.toBeNull()
    expect(r.price).toBe(159)
  })
})
