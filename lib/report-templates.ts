import type { LensTypeValue } from './lens'

// ── 렌즈별 보고서 필수 양식 (매뉴얼 v4.1 + 보고서 작성 매뉴얼 §9) ──────────────
// ① 본문 마크다운 템플릿: 판정 근거가 본문에 반드시 남도록 섹션 고정.
//    - §9 공통 뼈대(한 줄 요약·판정 요약 표·왜 N단계인가·가격 3축·반증 표·판정 이력·
//      데이터/한계)에 렌즈별 G 근거 블록을 끼워 넣는다.
// ② 필수 G 판정 항목: 렌즈별로 판정 반영 패널에서 반드시 응답해야 발행 가능.

// 종목 태그형 보고서 공통 머리 (§9 판정 요약 + 왜 N단계인가).
const REPORT_HEAD = `# [티커] [회사명]

**[N]단계: [표시명]** · 기준일 [YYYY-MM-DD] · 다음 정기 점검 [YYYY-MM-DD]

> **한 줄 요약**
> [투자 근거]는 [상태]입니다. [모멘텀 근거]가 확인됐지만, [가격/핵심 리스크]는 추가 확인이 필요합니다.

## 판정 요약

| 항목 | 상태 | 핵심 근거 |
|---|---|---|
| 투자 근거 | 충족/확인 중/미충족 | [수요 KPI], [수익성 KPI] |
| 실적 모멘텀 | [G3s]/4 | NTM 매출 [x]%, EPS [y]% 변화 |
| 가격·밸류에이션 | 주의/중립/매력 | 가격 위치 / 상대 밸류에이션 |
| 핵심 리스크 | [등급] | [측정 가능한 한 문장] |

## 왜 [N]단계인가

1. **수요(G1):** [사실]. 따라서 [해석]. 다만 [한계].
2. **수익성(G2):** [사실]. 따라서 [해석]. 다만 [한계].
3. **실적 기대(G3s):** [추정치 변화와 직접 원인]. [추정치 수 / 갱신일].`

// 가격·밸류에이션 3축 (§4) — 사업 단계와 분리해서 표시.
const PRICE_BLOCK = `## 가격·밸류에이션 (사업 단계와 분리)

- **가격 위치:** [예: 52주 고점 대비 -12% / 과거 범위 내 위치]
- **밸류에이션:** [지표, 현재값, 과거·동종 비교]
  - 흑자 전(pre-profit): EV/Sales · PSR · RPO 배수 (P/E 무의미)
  - 흑자 기업: P/E · EV/EBITDA · FCF yield
- **시장 위험:** [20일 변동성·추세 판단]

> 가격이 높다는 사실은 사업 가설의 부정이 아님. G1·G2가 통과인 한 사업 근거는 유효하며,
> "과열"은 가격·밸류에이션 위험으로만 표기(4-B = "사업 개선 지속 + 가격 위험 주의").`

// 차트·수급 (진입 타이밍·가격 위험 레이어) — 단계 판정(G1~G3s)의 입력이 아님.
const CHART_BLOCK = `## 차트·수급 (진입 타이밍·가격 위험 — 단계 판정과 독립)

| 항목 | 확인 지표 | 판단 |
|---|---|---|
| 추세 | 50일·200일 이동평균, 고점·저점 구조 | [예: 중기 상승 추세 유지] |
| 가격 위치 | 52주 고점 대비 낙폭, 이평선 이격도 | [예: 고점 부근, 단기 가격 위험 높음] |
| 변동성 | ATR·최근 변동성 | [예: 변동성 높아 손실 범위 큼] |
| 거래량 | 돌파·하락 시 평균 대비 거래량 | [예: 거래량 동반 돌파 미확인] |
| 지지·저항 | 최근 횡보 구간·전고점 | [예: 전고점 부근 단기 저항] |

> 차트는 **1~4단계 분류를 바꾸지 않음.** 과열이면 "4-B: 사업 개선 지속·가격 위험 주의"
> 또는 "신규 진입 대기"의 근거로만 사용. 추세가 훼손돼도 논리를 즉시 폐기하지 않고
> 실적·수요 반증 조건을 재확인. 주관적 표현("차트 좋아 보임") 금지 — 지표 3~5개 고정.`

// 반증 조건 + 판정 이력 + 데이터/한계 (§5·§7·§8 꼬리).
const REPORT_TAIL = `## 무엇이 틀릴 수 있나 (반증 조건 — 사전 정의)

| 반증 조건 | 확인 지표 | 발생 시 | 확인 시점 |
|---|---|---|---|
| [수요 둔화 조건] | [매출·백로그 수치] | G1 재평가 | 다음 실적 발표 |
| [마진 악화 조건] | [OPM 하단 기준] | G2 재평가 | 분기 실적 |
| [기대 하향 조건] | [NTM 매출·EPS 하향] | G3s −1 | 실적 후 3거래일 |
| [가격 위험 조건] | [밸류에이션 상단 초과] | 단계 변경 없이 가격 경고 | 주간 |

> 반증 조건은 **사전에** 정의. 주가가 내린 뒤 이유를 찾아 붙이지 않음.

## 판정 이력

| 날짜 | 변경 전 → 후 | 직접 원인 | 바뀌지 않은 것 | 출처 |
|---|---|---|---|---|
| [YYYY-MM-DD] | [전 단계] → [현 단계] | [직접 사실] | [유지된 판정] | [출처] |

## 데이터와 한계

- 출처: [실적 공시 / IR / FactSet 등]
- 데이터 기준일: [YYYY-MM-DD HH:MM]
- 데이터 부족 항목은 해당 G값을 비워 '판정 보류'(미판정)로 남김.`

// 렌즈별 G 근거 블록 — 머리와 가격 블록 사이에 끼워 넣는다.
const LENS_EVIDENCE: Record<Exclude<LensTypeValue, 'macro'>, string> = {
  earnings: `## 컨센서스 변화 (G3 근거)

- NTM EPS: 이전 → 이후 (변화율 %)
- NTM Revenue: 이전 → 이후 (변화율 %)
- 추정치 수 / 갱신일: (몇 개 기관 기준, 언제)
- **판정:** 둘 다 ≥ +1.0% 상향이면 G3=1(→ G3s +1), 아니면 G3=0(→ G3s −1) (§A.1·§A.2)

## 분기 핵심 지표

- (매출 / 영업이익 / 가이던스 등 — 렌즈 필드와 동일하게)`,
  financials: `## 핵심 재무 항목 (G2 근거)

- 업종 임계 대비: (예: EMS OPM ≥5.0% / 메모리IP GM ≥70% / SaaS NRR ≥105%)
- 히스테리시스 띠 여부: (임계~임계−1%p면 직전 분기 G2 유지, §A.5)
- **판정:** 임계 통과 → G2=1 / 미통과 → G2=0`,
  valuechain: `## 산업·체인 구조

- (어느 산업의 밸류체인 / 병목 단계 — 렌즈 필드와 동일하게)

## 수요 신호 (G1 근거)

- book-to-bill / 수주·백로그: (편입 ≥1.00, 이탈 <0.95, 띠 구간은 직전 유지 — §A.5)
- **판정:** 조건 통과 → G1=1 / 미통과 → G1=0`,
  news: `## 사건 요약

- (무슨 일이 있었나 — 원문 링크는 렌즈 필드에)

## 영향 판단

- (호재 / 악재 / 중립 + 강도 — 시장·태그 종목에 미칠 영향)

## 킬라인 해당 여부 (§A.6)

- 해당 종목 킬 조건(AND 조건)에 걸리는지: (예 / 아니오 + 근거)
- 주의: 추정치 상향 멈춤 **단독**은 G3=0(강등 1칸)이지 킬 아님`,
}

function composeStockReport(lens: Exclude<LensTypeValue, 'macro'>): string {
  return [REPORT_HEAD, LENS_EVIDENCE[lens], PRICE_BLOCK, CHART_BLOCK, REPORT_TAIL].join(
    '\n\n',
  )
}

export const REPORT_TEMPLATES: Record<LensTypeValue, string> = {
  earnings: composeStockReport('earnings'),
  financials: composeStockReport('financials'),
  valuechain: composeStockReport('valuechain'),
  news: composeStockReport('news'),
  // 거시는 종목 G값과 독립 — 종목 판정 뼈대 대신 시장·포트폴리오 관점 뼈대를 쓴다.
  macro: `# [주제] (거시 렌즈)

**기준일 [YYYY-MM-DD]** · 다음 점검 [YYYY-MM-DD]

> **한 줄 요약**
> [지표·방향]이 [상태]이며, [영향받는 테마·자금줄]에 [긍정/제한] 요인입니다.

## 지표·방향

- (금리 / 환율 / 유가 등 — 렌즈 필드와 동일하게)

## 시장 영향

- (위험선호 / 섹터 로테이션 / 자금줄 관점)

## 포트폴리오 영향

- 종목 G값과는 **독립** — 이 글은 단계 판정에 자동 반영되지 않음.
- 위험 관리 규칙(테마·합산 상한, 총 익스포저) 관점에서 서술.

## 데이터와 한계

- 출처: [지표 출처]
- 데이터 기준일: [YYYY-MM-DD HH:MM]`,
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
