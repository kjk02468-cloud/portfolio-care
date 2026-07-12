import type { LensTypeValue } from './lens'

// ── 렌즈별 보고서 필수 양식 (매뉴얼 v4.1) ─────────────────────────────────────
// ① 본문 마크다운 템플릿: 판정 근거가 본문에 반드시 남도록 섹션 고정.
// ② 필수 G 판정 항목: 렌즈별로 판정 반영 패널에서 반드시 응답해야 발행 가능.

export const REPORT_TEMPLATES: Record<LensTypeValue, string> = {
  earnings: `## 분기 요약
(어느 분기, 헤드라인 결과 — 서프라이즈 여부는 렌즈 필드에)

## 컨센서스 변화 (G3 근거)
- NTM EPS: 이전 → 이후 (변화율 %)
- NTM Revenue: 이전 → 이후 (변화율 %)
- 판정: 둘 다 ≥ +1.0% 상향이면 G3=1, 아니면 G3=0 (§A.1)

## 핵심 지표
- (매출/영업이익/가이던스 등 — 렌즈 필드와 동일하게)

## 다음 분기 관전 포인트
- `,
  financials: `## 핵심 재무 항목 (G2 근거)
- 업종 임계 대비: (예: EMS OPM ≥5.0% / 메모리IP GM ≥70% / SaaS NRR ≥105%)
- 히스테리시스 띠 여부: (임계~임계−1%p면 직전 분기 G2 유지, §A.5)

## 해석
(재무제표를 어떻게 읽어야 하는지)

## 연결 (실적·거시·뉴스)
(related_posts로 연결한 글과의 관계)`,
  valuechain: `## 산업·체인 구조
(어느 산업의 밸류체인인지 — 단계 순서는 렌즈 필드에)

## 수요 신호 (G1 근거)
- book-to-bill / 수주·백로그: (편입 ≥1.00, 이탈 <0.95, 띠 구간은 직전 유지 — §A.5)

## 병목·자본 집중
(현재 병목 단계와 자본이 몰린 정도 — 렌즈 필드와 동일하게)`,
  news: `## 사건 요약
(무슨 일이 있었나 — 원문 링크는 렌즈 필드에)

## 영향 판단
(호재/악재/중립 + 강도 — 렌즈 필드와 동일하게. 시장·태그 종목에 미칠 영향)

## 킬라인 해당 여부
- 해당 종목 킬 조건(AND 조건 §A.6)에 걸리는지: (예/아니오 + 근거)
- 주의: 추정치 상향 멈춤 단독은 G3=0(강등 1칸)이지 킬 아님`,
  macro: `## 지표·방향
(금리/환율/유가 등 — 렌즈 필드와 동일하게)

## 시장 영향

## 포트폴리오 영향
(종목 G값과는 독립 — 이 글은 단계 판정에 자동 반영되지 않음)`,
}

// ── 렌즈별 필수 판정 응답 ────────────────────────────────────────────────────
// 값의 의미: 그 렌즈 보고서에 종목이 태그돼 있으면, 태그된 각 종목에 대해
// 해당 필드를 반드시 명시적으로 선택해야 발행 가능 (임시저장은 자유).
// '변경없음'도 유효한 응답 — 매 보고서마다 판정을 의식적으로 확인시키는 것이 목적.

export type JudgeField = 'g3' | 'g1' | 'g2' | 'kill'

export const REQUIRED_JUDGE_FIELDS: Record<LensTypeValue, JudgeField[]> = {
  earnings: ['g3'], // §A.1 — 실적 후 컨센 상향 여부
  financials: ['g2'], // 수익성
  valuechain: ['g1'], // 수요
  news: ['kill'], // 킬라인 발화 여부
  macro: [], // 종목 G값과 독립
}

export const JUDGE_FIELD_LABELS: Record<JudgeField, string> = {
  g3: 'G3 — 컨센 상향 여부',
  g1: 'G1 — 수요 조건',
  g2: 'G2 — 수익성 조건',
  kill: '킬라인 발화 여부',
}

// ── 판정 반영 페이로드 (post.stageUpdates JSON의 항목) ───────────────────────
// 각 태그 종목별 선택 응답. 미선택(undefined/'')은 '반영 안함'.
export interface StageUpdateEntry {
  stockId: string
  ticker: string
  g3?: 'up' | 'down' | 'skip' // up=+1, down=−1 (§A.2), skip=반영 안함(명시적)
  g1?: 'pass' | 'fail' | 'keep'
  g2?: 'pass' | 'fail' | 'keep'
  g4?: 'room' | 'hot' | 'keep' // room=여유(1), hot=과열(0)
  kill?: 'on' | 'off' | 'keep'
}

/** 발행 전 검증: 이 렌즈에서 태그 종목마다 필수 필드가 응답됐는가. */
export function missingRequiredJudgements(
  lensType: LensTypeValue,
  taggedStockIds: string[],
  updates: StageUpdateEntry[],
): { stockId: string; field: JudgeField }[] {
  const required = REQUIRED_JUDGE_FIELDS[lensType]
  if (required.length === 0 || taggedStockIds.length === 0) return []
  const byStock = new Map(updates.map((u) => [u.stockId, u]))
  const missing: { stockId: string; field: JudgeField }[] = []
  for (const id of taggedStockIds) {
    const u = byStock.get(id)
    for (const f of required) {
      if (!u?.[f]) missing.push({ stockId: id, field: f })
    }
  }
  return missing
}
