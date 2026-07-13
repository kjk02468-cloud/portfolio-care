// 투자 매뉴얼 v4.1 — 포트폴리오 비중 규율. 매뉴얼 "구성 제한"·"메타테마" 표를 그대로
// 이식한 결정적 검사기. 모델 포트폴리오(목표 비중)를 넣으면 위반 목록을 돌려준다.
//
// 원칙(§원칙 표): 종목당 상한·종목 수 상한·익스포저·체인 상한은 **강제**(초과분 트림),
// 단계별 합계는 **권장 범위**(점검·메모만, 강제 리밸 금지)로 심각도를 구분한다.

import { judgeStock, type StockStageFields, type StageValue } from './stage-judge'

// ── 단계별 종목당 상한(%) · 종목 수 상한 (강제) — 매뉴얼 §종목당 비중 상한 표 ──
export const STAGE_POSITION_CAP: Record<StageValue, number> = {
  0: 0, // 이탈 — 청산
  1: 0, // 관망 — 비중 0%
  2: 15,
  3: 15,
  4: 10,
}

export const STAGE_COUNT_CAP: Partial<Record<StageValue, number>> = {
  2: 3,
  3: 3,
  4: 4,
}

// 단계별 합계 권장 범위(%) — 강제 아님, 사후 점검용 (매뉴얼 §단계별 합계 권장 범위)
export const STAGE_SUM_RANGE: Partial<Record<StageValue, [number, number]>> = {
  2: [10, 25],
  3: [30, 50],
  4: [25, 45],
}

// 그로스 익스포저 상한(%) — 레버리지 사용 시 115, 미사용 100 (§구성 제한)
export const GROSS_EXPOSURE_CAP = 115

// ── 자금줄(메타테마) — 종목당 1줄. 단일줄 상한은 매뉴얼 메타테마 표의 "상한" ──
// connectivity_ic는 단독 상한 없이 아래 체인 그룹으로만 관리(표의 30%가 곧 체인).
export const FUNDING_LINES = {
  optical_module: { label: '광학모듈', cap: 15 },
  connectivity_ic: { label: '연결IC', cap: null },
  server_ems: { label: '서버제조', cap: 20 },
  memory_ip: { label: '메모리IP', cap: 20 },
  gpu_cloud: { label: 'GPU클라우드', cap: 15 },
  dc_power: { label: 'DC전력', cap: 15 },
  healthcare: { label: '헬스케어', cap: 25 },
  space_launch: { label: '우주발사', cap: 15 },
} as const

export type FundingLineKey = keyof typeof FUNDING_LINES
export const FUNDING_LINE_KEYS = Object.keys(FUNDING_LINES) as FundingLineKey[]

// 여러 자금줄을 가로지르는 테마 합산 상한 (§구성 제한: "연결·광학 체인 30% — AAOI+CRDO+ALAB")
export const THEME_GROUPS: {
  key: string
  label: string
  lines: FundingLineKey[]
  cap: number
}[] = [
  {
    key: 'connectivity_optical_chain',
    label: '연결·광학 체인',
    lines: ['optical_module', 'connectivity_ic'],
    cap: 30,
  },
]

export interface ModelPosition {
  ticker: string
  weight: number // 목표 비중 %
  fundingLine: FundingLineKey | null
  stage: StockStageFields
}

export type ViolationKind =
  | 'position_cap' // 종목당 상한 초과 (강제)
  | 'count_cap' // 단계 종목 수 초과 (강제)
  | 'theme_cap' // 테마(체인) 합산 초과 (강제)
  | 'gross_exposure' // 그로스 익스포저 초과 (강제)
  | 'stage_sum' // 단계 합계 권장 범위 밖 (권장)

export interface Violation {
  kind: ViolationKind
  severity: 'enforce' | 'advisory'
  message: string
  tickers: string[]
}

const round1 = (v: number) => Math.round(v * 10) / 10

/** 판정된 종목의 단계 값. 미판정은 null (비중 규율 대상 아님). */
export function positionStage(fields: StockStageFields): StageValue | null {
  const j = judgeStock(fields)
  return j.judged ? j.stage : null
}

/**
 * 모델 포트폴리오 비중 규율 검사. 위반을 심각도 순(강제 먼저)으로 돌려준다.
 * 순수 함수 — 테스트 대상. DB·판정 결과와 독립.
 */
export function checkPortfolio(positions: ModelPosition[]): Violation[] {
  const violations: Violation[] = []

  // 1) 종목당 상한 (강제)
  for (const p of positions) {
    const stage = positionStage(p.stage)
    if (stage === null) continue
    const cap = STAGE_POSITION_CAP[stage]
    if (p.weight > cap + 1e-9) {
      violations.push({
        kind: 'position_cap',
        severity: 'enforce',
        message: `${p.ticker} ${round1(p.weight)}% > ${stage}단계 상한 ${cap}% — 초과분 트림`,
        tickers: [p.ticker],
      })
    }
  }

  // 2) 단계별 종목 수 상한 (강제) — 비중 0 초과 종목만 집계
  const byStage = new Map<StageValue, ModelPosition[]>()
  for (const p of positions) {
    if (p.weight <= 0) continue
    const stage = positionStage(p.stage)
    if (stage === null) continue
    const arr = byStage.get(stage) ?? []
    arr.push(p)
    byStage.set(stage, arr)
  }
  for (const [stage, arr] of byStage) {
    const cap = STAGE_COUNT_CAP[stage]
    if (cap !== undefined && arr.length > cap) {
      violations.push({
        kind: 'count_cap',
        severity: 'enforce',
        message: `${stage}단계 ${arr.length}종목 > 상한 ${cap}종목 — 승급 보류 또는 G3s 최저 하향`,
        tickers: arr.map((p) => p.ticker),
      })
    }
  }

  // 3) 테마(체인) 합산 상한 (강제)
  for (const g of THEME_GROUPS) {
    const members = positions.filter((p) => p.fundingLine && g.lines.includes(p.fundingLine))
    const sum = members.reduce((a, p) => a + p.weight, 0)
    if (sum > g.cap + 1e-9) {
      violations.push({
        kind: 'theme_cap',
        severity: 'enforce',
        message: `${g.label} 합산 ${round1(sum)}% > 상한 ${g.cap}% — 초과분 트림 검토`,
        tickers: members.map((p) => p.ticker),
      })
    }
  }

  // 3b) 단일 자금줄 상한 (강제) — cap이 지정된 줄만
  const byLine = new Map<FundingLineKey, ModelPosition[]>()
  for (const p of positions) {
    if (!p.fundingLine || p.weight <= 0) continue
    const arr = byLine.get(p.fundingLine) ?? []
    arr.push(p)
    byLine.set(p.fundingLine, arr)
  }
  for (const [line, arr] of byLine) {
    const cap = FUNDING_LINES[line].cap
    if (cap === null) continue
    const sum = arr.reduce((a, p) => a + p.weight, 0)
    if (sum > cap + 1e-9) {
      violations.push({
        kind: 'theme_cap',
        severity: 'enforce',
        message: `${FUNDING_LINES[line].label} 합산 ${round1(sum)}% > 단일줄 상한 ${cap}%`,
        tickers: arr.map((p) => p.ticker),
      })
    }
  }

  // 4) 그로스 익스포저 (강제)
  const gross = positions.reduce((a, p) => a + Math.max(0, p.weight), 0)
  if (gross > GROSS_EXPOSURE_CAP + 1e-9) {
    violations.push({
      kind: 'gross_exposure',
      severity: 'enforce',
      message: `그로스 익스포저 ${round1(gross)}% > 상한 ${GROSS_EXPOSURE_CAP}% — 레버 축소`,
      tickers: [],
    })
  }

  // 5) 단계별 합계 권장 범위 (권장 — 점검·메모만)
  for (const [stage, [lo, hi]] of Object.entries(STAGE_SUM_RANGE) as unknown as [
    StageValue,
    [number, number],
  ][]) {
    const arr = byStage.get(Number(stage) as StageValue)
    if (!arr || arr.length === 0) continue
    const sum = arr.reduce((a, p) => a + p.weight, 0)
    if (sum < lo - 1e-9 || sum > hi + 1e-9) {
      violations.push({
        kind: 'stage_sum',
        severity: 'advisory',
        message: `${stage}단계 합계 ${round1(sum)}% (권장 ${lo}~${hi}%) — 점검·메모만, 강제 리밸 금지`,
        tickers: arr.map((p) => p.ticker),
      })
    }
  }

  // 강제 먼저, 그다음 권장
  return violations.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'enforce' ? -1 : 1,
  )
}

/** 자금줄별 합산 비중 요약 (뷰용). */
export function fundingLineSummary(positions: ModelPosition[]) {
  return FUNDING_LINE_KEYS.map((line) => {
    const members = positions.filter((p) => p.fundingLine === line && p.weight > 0)
    const sum = members.reduce((a, p) => a + p.weight, 0)
    return {
      line,
      label: FUNDING_LINES[line].label,
      cap: FUNDING_LINES[line].cap,
      sum: round1(sum),
      tickers: members.map((p) => p.ticker),
    }
  }).filter((s) => s.tickers.length > 0)
}
