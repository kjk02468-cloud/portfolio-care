import { describe, it, expect } from 'vitest'
import { checkPortfolio, fundingLineSummary, type ModelPosition } from './portfolio-rules'

// 현 포트 8종 (매뉴얼 예시 = 사용자 실보유 비중). G값은 단계별 예시.
const stage3 = { g1: 1, g2: 1, g3s: 2, g4: 1, kill: false } // ⑤ 3단계
const stage4a = { g1: 1, g2: 1, g3s: 4, g4: 0, kill: false } // ③ 4-A
const stage4b = { g1: 1, g2: 1, g3s: 2, g4: 0, kill: false } // ④ 4-B
const stage2 = { g1: 1, g2: 1, g3s: 1, g4: 1, kill: false } // ⑥ 2단계

const currentPort: ModelPosition[] = [
  { ticker: 'AAOI', weight: 15, fundingLine: 'optical_module', stage: stage3 },
  { ticker: 'CLS', weight: 15, fundingLine: 'server_ems', stage: stage3 },
  { ticker: 'RMBS', weight: 15, fundingLine: 'memory_ip', stage: stage3 },
  { ticker: 'ALAB', weight: 10, fundingLine: 'connectivity_ic', stage: stage4a },
  { ticker: 'CRDO', weight: 10, fundingLine: 'connectivity_ic', stage: stage4a },
  { ticker: 'NBIS', weight: 10, fundingLine: 'gpu_cloud', stage: stage4b },
  { ticker: 'BE', weight: 10, fundingLine: 'dc_power', stage: stage4b },
  { ticker: 'RKLB', weight: 15, fundingLine: 'space_launch', stage: stage2 },
]

describe('checkPortfolio — 현 포트(8종, 합 100%)', () => {
  const v = checkPortfolio(currentPort)

  it('연결·광학 체인(AAOI+CRDO+ALAB=35%)이 30% 상한을 넘어 강제 위반으로 잡힌다', () => {
    const chain = v.find((x) => x.kind === 'theme_cap' && x.message.includes('연결·광학 체인'))
    expect(chain).toBeDefined()
    expect(chain!.severity).toBe('enforce')
    expect(chain!.tickers.sort()).toEqual(['AAOI', 'ALAB', 'CRDO'])
  })

  it('종목당 상한(3=15·4=10·2=15)은 모두 통과 — position_cap 위반 없음', () => {
    expect(v.some((x) => x.kind === 'position_cap')).toBe(false)
  })

  it('종목 수 상한(3단계 3·4단계 4·2단계 1)은 모두 통과', () => {
    expect(v.some((x) => x.kind === 'count_cap')).toBe(false)
  })

  it('그로스 익스포저 100%는 115% 이하 — 위반 없음', () => {
    expect(v.some((x) => x.kind === 'gross_exposure')).toBe(false)
  })
})

describe('checkPortfolio — 개별 규칙', () => {
  it('종목당 상한 초과(4단계 12% > 10%)', () => {
    const v = checkPortfolio([
      { ticker: 'X', weight: 12, fundingLine: null, stage: stage4a },
    ])
    const hit = v.find((x) => x.kind === 'position_cap')
    expect(hit?.severity).toBe('enforce')
    expect(hit?.tickers).toEqual(['X'])
  })

  it('3단계 종목 수 상한 초과(4종 > 3)', () => {
    const four: ModelPosition[] = ['A', 'B', 'C', 'D'].map((t) => ({
      ticker: t,
      weight: 10,
      fundingLine: null,
      stage: stage3,
    }))
    const hit = checkPortfolio(four).find((x) => x.kind === 'count_cap')
    expect(hit?.severity).toBe('enforce')
    expect(hit?.tickers.length).toBe(4)
  })

  it('그로스 익스포저 초과(합 120% > 115%)', () => {
    const v = checkPortfolio([
      { ticker: 'A', weight: 60, fundingLine: null, stage: stage3 },
      { ticker: 'B', weight: 60, fundingLine: null, stage: stage3 },
    ])
    // A·B 각각 15% 상한 초과도 잡히지만 gross_exposure도 반드시 포함
    expect(v.some((x) => x.kind === 'gross_exposure')).toBe(true)
  })

  it('단계 합계 권장 범위 밖은 advisory (강제 아님)', () => {
    // 3단계 1종 10% → 권장 30~50% 미달
    const v = checkPortfolio([
      { ticker: 'A', weight: 10, fundingLine: null, stage: stage3 },
    ])
    const hit = v.find((x) => x.kind === 'stage_sum')
    expect(hit?.severity).toBe('advisory')
  })

  it('미판정 종목은 비중 규율 대상이 아님', () => {
    const v = checkPortfolio([
      { ticker: 'U', weight: 50, fundingLine: null, stage: { g1: null, g2: 1, g3s: 2, g4: 1, kill: false } },
    ])
    expect(v.some((x) => x.kind === 'position_cap' || x.kind === 'count_cap')).toBe(false)
  })

  it('강제 위반이 권장보다 먼저 정렬된다', () => {
    const v = checkPortfolio(currentPort)
    const firstAdvisory = v.findIndex((x) => x.severity === 'advisory')
    const lastEnforce = v.map((x) => x.severity).lastIndexOf('enforce')
    if (firstAdvisory !== -1 && lastEnforce !== -1) {
      expect(lastEnforce).toBeLessThan(firstAdvisory)
    }
  })
})

describe('fundingLineSummary', () => {
  it('자금줄별 합산과 편입 종목을 돌려준다', () => {
    const s = fundingLineSummary(currentPort)
    const conn = s.find((x) => x.line === 'connectivity_ic')
    expect(conn?.sum).toBe(20)
    expect(conn?.tickers.sort()).toEqual(['ALAB', 'CRDO'])
  })
})
