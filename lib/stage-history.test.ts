import { describe, it, expect } from 'vitest'
import { stageLabelOf, stageTransition, unchangedNote } from './stage-history'

describe('stageLabelOf', () => {
  it('G값 완전하면 파생 라벨', () => {
    expect(stageLabelOf({ g1: 1, g2: 1, g3s: 2, g4: 1, kill: false })).toBe('3단계')
    expect(stageLabelOf({ g1: 1, g2: 1, g3s: 4, g4: 0, kill: false })).toBe('4단계 4-A')
  })
  it('G값 불완전하면 미판정', () => {
    expect(stageLabelOf({ g1: 1, g2: 1, g3s: null, g4: 1, kill: false })).toBe('미판정')
  })
  it('kill이면 이탈', () => {
    expect(stageLabelOf({ g1: null, g2: null, g3s: null, g4: null, kill: true })).toBe('이탈')
  })
})

describe('stageTransition', () => {
  it('단계 라벨이 바뀌면 changed=true', () => {
    const t = stageTransition(
      { g1: 1, g2: 1, g3s: 1, g4: 1, kill: false }, // 2단계
      { g1: 1, g2: 1, g3s: 2, g4: 1, kill: false }, // 3단계
    )
    expect(t.changed).toBe(true)
    expect(t.fromLabel).toBe('2단계')
    expect(t.toLabel).toBe('3단계')
  })
  it('G값이 바뀌어도 단계 라벨이 같으면 changed=false (G3s 3→4 둘 다 4-A)', () => {
    const t = stageTransition(
      { g1: 1, g2: 1, g3s: 3, g4: 0, kill: false },
      { g1: 1, g2: 1, g3s: 4, g4: 0, kill: false },
    )
    expect(t.changed).toBe(false)
  })
  it('미판정 → 판정도 변경으로 잡음', () => {
    const t = stageTransition(
      { g1: null, g2: 1, g3s: 2, g4: 1, kill: false },
      { g1: 1, g2: 1, g3s: 2, g4: 1, kill: false },
    )
    expect(t.changed).toBe(true)
    expect(t.fromLabel).toBe('미판정')
    expect(t.toLabel).toBe('3단계')
  })
})

describe('unchangedNote (§7 "바뀌지 않은 것")', () => {
  it('G1·G2가 그대로면 언급', () => {
    const note = unchangedNote(
      { g1: 1, g2: 1, g3s: 1, g4: 1, kill: false },
      { g1: 1, g2: 1, g3s: 2, g4: 1, kill: false },
    )
    expect(note).toBe('G1·G2 유지')
  })
  it('G1만 그대로면 G1만', () => {
    const note = unchangedNote(
      { g1: 1, g2: 0, g3s: 1, g4: 1, kill: false },
      { g1: 1, g2: 1, g3s: 1, g4: 1, kill: false },
    )
    expect(note).toBe('G1 유지')
  })
  it('둘 다 바뀌면 null', () => {
    const note = unchangedNote(
      { g1: 0, g2: 0, g3s: 1, g4: 1, kill: false },
      { g1: 1, g2: 1, g3s: 1, g4: 1, kill: false },
    )
    expect(note).toBeNull()
  })
})
