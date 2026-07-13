import { prisma } from './prisma'
import { judgeStock, STAGE_META, type StockStageFields } from './stage-judge'
import { notifyStageChange } from './notifications'

// 단계 변경 이력(§7) — 확정 판정이 바뀌어 "파생 단계 라벨"이 달라질 때만 기록한다.
// G값이 바뀌어도 단계가 같으면(예: G3s 3→4 둘 다 4-A) 이력을 남기지 않는다.

/** G값에서 파생되는 단계 라벨. 미판정 포함. 순수 함수 — 테스트 대상. */
export function stageLabelOf(fields: StockStageFields): string {
  const j = judgeStock(fields)
  if (!j.judged) return '미판정'
  return `${STAGE_META[j.stage].label}${j.subtype ? ` ${j.subtype}` : ''}`
}

export interface StageTransition {
  changed: boolean
  fromLabel: string
  toLabel: string
}

export function stageTransition(before: StockStageFields, after: StockStageFields): StageTransition {
  const fromLabel = stageLabelOf(before)
  const toLabel = stageLabelOf(after)
  return { changed: fromLabel !== toLabel, fromLabel, toLabel }
}

/** 바뀌지 않은 판정 자동 산출(§7 "바뀌지 않은 것" 칸): G1·G2가 그대로면 언급. */
export function unchangedNote(before: StockStageFields, after: StockStageFields): string | null {
  const parts: string[] = []
  if (before.g1 === after.g1 && after.g1 !== null) parts.push('G1')
  if (before.g2 === after.g2 && after.g2 !== null) parts.push('G2')
  return parts.length ? `${parts.join('·')} 유지` : null
}

/**
 * 단계가 바뀌었으면 StageChangeLog에 1행 추가하고 true 반환. 안 바뀌었으면 false.
 * 확정 G값을 쓰는 두 경로(보고서 발행·수동 보정)에서 공통 호출.
 */
export async function recordStageChange(args: {
  stockId: string
  ticker: string
  before: StockStageFields
  after: StockStageFields
  directCause: string
  source: string
}): Promise<boolean> {
  const t = stageTransition(args.before, args.after)
  if (!t.changed) return false
  await prisma.stageChangeLog.create({
    data: {
      stockId: args.stockId,
      ticker: args.ticker,
      fromStage: t.fromLabel,
      toStage: t.toLabel,
      directCause: args.directCause.slice(0, 300),
      unchanged: unchangedNote(args.before, args.after),
      source: args.source,
    },
  })
  // W5 알림 — 단계가 바뀐 종목의 보유자(킬이면 전체)에게 인앱 알림. 실패해도 판정은 유지.
  await notifyStageChange({
    ticker: args.ticker,
    fromLabel: t.fromLabel,
    toLabel: t.toLabel,
    directCause: args.directCause.slice(0, 300),
  })
  return true
}
