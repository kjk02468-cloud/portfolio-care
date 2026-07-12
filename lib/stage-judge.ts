// 투자 매뉴얼 v4.1 — 단계 판정 결정트리 ①~⑦ (stage_judge.py의 TS 이식).
// 트리를 위에서부터 첫 매칭만 적용한다. stage는 항상 G값에서 파생(저장 금지).

export interface JudgeInput {
  kill: boolean
  g1: 0 | 1
  g2: 0 | 1
  g3s: 0 | 1 | 2 | 3 | 4
  g4: 0 | 1 // 0=과열(고점 부근), 1=여유(충분히 조정)
}

export type StageValue = 0 | 1 | 2 | 3 | 4 // 0 = 즉시 이탈(킬)

export interface JudgeResult {
  stage: StageValue
  subtype: '4-A' | '4-B' | null
  rule: '①' | '②' | '③' | '④' | '⑤' | '⑥' | '⑦'
  action: string
  explanation: string
}

/** 결정트리 — 순서 고정, 첫 매칭만. */
export function judgeStage(input: JudgeInput): JudgeResult {
  const { kill, g1, g2, g3s, g4 } = input

  // ① 킬라인·투자 이유반증 → 즉시 이탈 (단계 무관, 상시)
  if (kill) {
    return {
      stage: 0,
      subtype: null,
      rule: '①',
      action: '즉시 이탈',
      explanation: '킬라인이 발화했어요. 단계와 무관하게 즉시 이탈 대상이에요.',
    }
  }
  // ② G1=0 OR G2=0 → 1단계(관찰)
  if (g1 === 0 || g2 === 0) {
    return {
      stage: 1,
      subtype: null,
      rule: '②',
      action: '관망·비중 0%',
      explanation: '수요(G1) 또는 수익성(G2) 조건을 통과하지 못해 관찰 단계예요.',
    }
  }
  // ③ G3s ≥ 3 → 4단계 4-A (ride, 가격 무관)
  if (g3s >= 3) {
    return {
      stage: 4,
      subtype: '4-A',
      rule: '③',
      action: 'ride·추매금지',
      explanation:
        '추정치 모멘텀이 성숙(G3s≥3)해서 가격과 무관하게 4-A(ride)예요. 트림 없이 보유, 추가매수·레버리지는 금지.',
    }
  }
  // ④ G3s ≥ 2 AND G4=0 → 4단계 4-B (과열·수확)
  if (g3s >= 2 && g4 === 0) {
    return {
      stage: 4,
      subtype: '4-B',
      rule: '④',
      action: '트림·2단계 회전',
      explanation:
        '모멘텀은 있지만(G3s≥2) 가격이 과열(G4=0)이라 4-B예요. 촉매 시 1/3 기계적 트림 후 2단계로 회전.',
    }
  }
  // ⑤ G3s = 2 AND G4=1 → 3단계
  if (g3s === 2 && g4 === 1) {
    return {
      stage: 3,
      subtype: null,
      rule: '⑤',
      action: '유지·추매 금지',
      explanation:
        '모멘텀 레벨 2 + 가격 여유(G4=1)라 3단계예요. 유지하되 추매는 금지(급여 2순위 예외만).',
    }
  }
  // ⑥ G3s ≤ 1 AND G4=1 → 2단계 (적립)
  if (g3s <= 1 && g4 === 1) {
    return {
      stage: 2,
      subtype: null,
      rule: '⑥',
      action: '적립·급여 1순위',
      explanation:
        '투자 이유는 확인됐고 모멘텀은 미성숙(G3s≤1), 가격은 여유예요. 적립·신규 편입 대상.',
    }
  }
  // ⑦ G3s ≤ 1 AND G4=0 → 2단계 (과열·추가매수 금지)
  return {
    stage: 2,
    subtype: null,
    rule: '⑦',
    action: '보유·추가매수 금지(과열)',
    explanation:
      '2단계지만 가격이 과열(G4=0)이라 추가매수는 금지예요. 조정(G4=1)되면 ⑥ 적립으로.',
  }
}

/** 매뉴얼 고정 출력 포맷: [ALAB] stage=4 subtype=4-A G3s=4 G1✓ G2✓ G4✗ triggered_rule=③ action=… */
export function formatJudgeLine(ticker: string, input: JudgeInput): string {
  const r = judgeStage(input)
  const mark = (v: 0 | 1) => (v === 1 ? '✓' : '✗')
  const stageStr = r.stage === 0 ? '이탈' : String(r.stage)
  return `[${ticker.toUpperCase()}] stage=${stageStr} subtype=${r.subtype ?? '-'} G3s=${input.g3s} G1${mark(input.g1)} G2${mark(input.g2)} G4${mark(input.g4)} triggered_rule=${r.rule} action=${r.action}`
}

// ── 단계 메타 (UI 공용) ──────────────────────────────────────────────────────

export interface StageMeta {
  label: string
  role: string
  /** CSS class fragments on the design tokens */
  badgeClass: string
}

export const STAGE_META: Record<StageValue, StageMeta> = {
  0: { label: '이탈', role: '킬라인 발화 — 즉시 이탈', badgeClass: 'bg-loss/15 text-loss' },
  1: { label: '1단계', role: '관망 (비중 0%)', badgeClass: 'bg-surface-2 text-muted' },
  2: { label: '2단계', role: '적립 (급여 1순위)', badgeClass: 'bg-brand/10 text-brand' },
  3: { label: '3단계', role: '유지 (추매 금지)', badgeClass: 'stage-badge-3' },
  4: { label: '4단계', role: '수확 (ride·트림)', badgeClass: 'bg-gain/15 text-gain' },
}

// ── Stock 레코드(G값 nullable)에서 판정 ─────────────────────────────────────

export interface StockStageFields {
  g1: number | null
  g2: number | null
  g3s: number | null
  g4: number | null
  kill: boolean
}

export interface StockJudge extends JudgeResult {
  judged: true
}

export type StockJudgeMaybe = StockJudge | { judged: false }

/** G값이 하나라도 없으면 미판정. kill=true는 G값 없이도 ① 즉시 이탈. */
export function judgeStock(s: StockStageFields): StockJudgeMaybe {
  if (s.kill) return { judged: true, ...judgeStage({ kill: true, g1: 1, g2: 1, g3s: 0, g4: 1 }) }
  if (s.g1 === null || s.g2 === null || s.g3s === null || s.g4 === null) {
    return { judged: false }
  }
  return {
    judged: true,
    ...judgeStage({
      kill: false,
      g1: (s.g1 === 1 ? 1 : 0) as 0 | 1,
      g2: (s.g2 === 1 ? 1 : 0) as 0 | 1,
      g3s: Math.max(0, Math.min(4, s.g3s)) as JudgeInput['g3s'],
      g4: (s.g4 === 1 ? 1 : 0) as 0 | 1,
    }),
  }
}

/** §A.2 갱신: G3=1 → +1(상한4), G3=0 → −1(하한0). 0으로 리셋 금지. */
export function applyG3(g3s: number | null, g3: 0 | 1): number {
  const cur = g3s ?? 0
  return g3 === 1 ? Math.min(4, cur + 1) : Math.max(0, cur - 1)
}
