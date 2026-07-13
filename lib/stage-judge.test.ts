import { describe, it, expect } from 'vitest'
import { judgeStage, applyG3, judgeStock, formatJudgeLine } from './stage-judge'

// 결정트리 ①~⑦ (매뉴얼 v4.1) — 위에서부터 첫 매칭.
describe('judgeStage 결정트리', () => {
  it('① 킬라인 발화 → 즉시 이탈(stage 0), G값 무관', () => {
    const r = judgeStage({ kill: true, g1: 1, g2: 1, g3s: 4, g4: 1 })
    expect(r.stage).toBe(0)
    expect(r.rule).toBe('①')
  })

  it('② G1=0 → 1단계(관찰)', () => {
    expect(judgeStage({ kill: false, g1: 0, g2: 1, g3s: 3, g4: 1 }).stage).toBe(1)
  })

  it('② G2=0 → 1단계(관찰)', () => {
    const r = judgeStage({ kill: false, g1: 1, g2: 0, g3s: 3, g4: 1 })
    expect(r.stage).toBe(1)
    expect(r.rule).toBe('②')
  })

  it('③ G3s≥3 → 4단계 4-A (가격 무관, ③이 ④보다 우선)', () => {
    const r = judgeStage({ kill: false, g1: 1, g2: 1, g3s: 4, g4: 0 })
    expect(r.stage).toBe(4)
    expect(r.subtype).toBe('4-A')
    expect(r.rule).toBe('③')
  })

  it('④ G3s=2 AND G4=0(과열) → 4단계 4-B', () => {
    const r = judgeStage({ kill: false, g1: 1, g2: 1, g3s: 2, g4: 0 })
    expect(r.stage).toBe(4)
    expect(r.subtype).toBe('4-B')
    expect(r.rule).toBe('④')
  })

  it('⑤ G3s=2 AND G4=1(여유) → 3단계', () => {
    const r = judgeStage({ kill: false, g1: 1, g2: 1, g3s: 2, g4: 1 })
    expect(r.stage).toBe(3)
    expect(r.rule).toBe('⑤')
  })

  it('⑥ G3s≤1 AND G4=1 → 2단계(적립)', () => {
    const r = judgeStage({ kill: false, g1: 1, g2: 1, g3s: 1, g4: 1 })
    expect(r.stage).toBe(2)
    expect(r.rule).toBe('⑥')
  })

  it('⑦ G3s≤1 AND G4=0 → 2단계(과열·추매금지)', () => {
    const r = judgeStage({ kill: false, g1: 1, g2: 1, g3s: 0, g4: 0 })
    expect(r.stage).toBe(2)
    expect(r.rule).toBe('⑦')
  })

  it('경계: G3s=2·G4=0은 ④(4-B)이지 ⑤(3단계) 아님 — 겹침 없음', () => {
    expect(judgeStage({ kill: false, g1: 1, g2: 1, g3s: 2, g4: 0 }).stage).toBe(4)
    expect(judgeStage({ kill: false, g1: 1, g2: 1, g3s: 2, g4: 1 }).stage).toBe(3)
  })

  it('매뉴얼 ALAB 예시 포맷 재현', () => {
    const line = formatJudgeLine('ALAB', { kill: false, g1: 1, g2: 1, g3s: 4, g4: 0 })
    expect(line).toBe('[ALAB] stage=4 subtype=4-A G3s=4 G1✓ G2✓ G4✗ triggered_rule=③ action=ride·추매금지')
  })
})

describe('applyG3 (§A.2 감쇠)', () => {
  it('G3=1 → +1, 상한 4', () => {
    expect(applyG3(2, 1)).toBe(3)
    expect(applyG3(4, 1)).toBe(4) // 상한
  })
  it('G3=0 → −1, 하한 0 (0으로 리셋 금지)', () => {
    expect(applyG3(2, 0)).toBe(1)
    expect(applyG3(0, 0)).toBe(0) // 하한
  })
  it('null g3s는 0에서 시작', () => {
    expect(applyG3(null, 1)).toBe(1)
    expect(applyG3(null, 0)).toBe(0)
  })
})

describe('judgeStock (nullable G값)', () => {
  it('G값 하나라도 null이면 미판정', () => {
    expect(judgeStock({ g1: 1, g2: 1, g3s: null, g4: 1, kill: false }).judged).toBe(false)
  })
  it('kill=true는 G값 없이도 즉시 이탈 판정', () => {
    const r = judgeStock({ g1: null, g2: null, g3s: null, g4: null, kill: true })
    expect(r.judged).toBe(true)
    if (r.judged) expect(r.stage).toBe(0)
  })
  it('모든 G값 있으면 정상 판정', () => {
    const r = judgeStock({ g1: 1, g2: 1, g3s: 2, g4: 1, kill: false })
    expect(r.judged).toBe(true)
    if (r.judged) expect(r.stage).toBe(3)
  })
})
