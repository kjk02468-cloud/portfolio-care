import { describe, it, expect } from 'vitest'
import { computeValuation, median, type ValuationSnapshot } from './valuation'

const base: ValuationSnapshot = {
  price: 100,
  marketCap: 10000,
  enterpriseValue: 12000,
  ttmRevenue: 3000,
  ttmEps: 5,
  evToSalesHistory: [3, 3.5, 4, 4.5, 5],
  peHistory: [15, 18, 20, 22, 25],
}

describe('median', () => {
  it('홀수 개수', () => expect(median([3, 1, 2])).toBe(2))
  it('짝수 개수', () => expect(median([1, 2, 3, 4])).toBe(2.5))
  it('음수·0·NaN 제외', () => expect(median([-1, 0, NaN, 10])).toBe(10))
  it('전부 무효면 null', () => expect(median([-1, 0])).toBeNull())
})

describe('computeValuation', () => {
  it('EV/Sales = EV / TTM매출', () => {
    const r = computeValuation(base)
    expect(r.evToSales).toBeCloseTo(4, 5) // 12000/3000
  })
  it('P/E = 가격 / TTM EPS (흑자)', () => {
    const r = computeValuation(base)
    expect(r.pe).toBeCloseTo(20, 5) // 100/5
    expect(r.preProfit).toBe(false)
  })
  it('5년 중앙값과 대비 위치', () => {
    const r = computeValuation(base)
    expect(r.evToSalesMedian5y).toBe(4) // median [3,3.5,4,4.5,5]
    expect(r.peMedian5y).toBe(20)
    expect(r.evToSalesVsMedianPct).toBeCloseTo(0, 5) // 4 vs 4
    expect(r.peVsMedianPct).toBeCloseTo(0, 5) // 20 vs 20
  })
  it('현재가 과거 중앙값보다 비싸면 양수', () => {
    const r = computeValuation({ ...base, enterpriseValue: 18000 }) // EV/S=6 vs 4
    expect(r.evToSalesVsMedianPct).toBeCloseTo(50, 5)
  })
  it('흑자 전(TTM EPS ≤ 0)이면 P/E null·preProfit true', () => {
    const r = computeValuation({ ...base, ttmEps: -2 })
    expect(r.pe).toBeNull()
    expect(r.preProfit).toBe(true)
    expect(r.peVsMedianPct).toBeNull()
    // EV/Sales는 흑자 전에도 유효
    expect(r.evToSales).toBeCloseTo(4, 5)
  })
  it('원자료 없으면 배수 null (지어내지 않음)', () => {
    const r = computeValuation({
      price: null, marketCap: null, enterpriseValue: null,
      ttmRevenue: null, ttmEps: null, evToSalesHistory: [], peHistory: [],
    })
    expect(r.evToSales).toBeNull()
    expect(r.pe).toBeNull()
    expect(r.evToSalesMedian5y).toBeNull()
    expect(r.preProfit).toBe(false)
  })
})
