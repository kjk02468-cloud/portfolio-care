import { prisma } from './prisma'
import { judgeStock, applyG3, STAGE_META } from './stage-judge'
import { recordStageChange } from './stage-history'
import { lensLabel } from './lens'
import type { StageUpdateEntry } from './report-templates'

/**
 * 경로 A: 보고서 최초 발행 시 태그 종목의 G값을 §A.2/§A.4대로 갱신하고
 * 결정트리로 재판정해 stageNote를 자동 기록한다. (한 번만 호출될 것 —
 * 호출부가 publishedAt 최초 스탬핑과 연동해 중복 적용을 막는다.)
 */
export async function applyStageUpdates(
  entries: StageUpdateEntry[],
  postTitle: string,
  lensType: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  for (const e of entries) {
    const stock = await prisma.stock.findUnique({ where: { id: e.stockId } })
    if (!stock) continue

    const changes: string[] = []
    let { g1, g2, g3s, g4, kill } = stock

    if (e.g3 === 'up' || e.g3 === 'down') {
      const next = applyG3(g3s, e.g3 === 'up' ? 1 : 0)
      changes.push(`G3=${e.g3 === 'up' ? 1 : 0} → G3s ${g3s ?? 0}→${next}`)
      g3s = next
    }
    if (e.g1 === 'pass' || e.g1 === 'fail') {
      const next = e.g1 === 'pass' ? 1 : 0
      if (next !== g1) changes.push(`G1 ${g1 ?? '-'}→${next}`)
      g1 = next
    }
    if (e.g2 === 'pass' || e.g2 === 'fail') {
      const next = e.g2 === 'pass' ? 1 : 0
      if (next !== g2) changes.push(`G2 ${g2 ?? '-'}→${next}`)
      g2 = next
    }
    if (e.g4 === 'room' || e.g4 === 'hot') {
      const next = e.g4 === 'room' ? 1 : 0
      if (next !== g4) changes.push(`G4 ${g4 ?? '-'}→${next}`)
      g4 = next
    }
    if (e.kill === 'on' || e.kill === 'off') {
      const next = e.kill === 'on'
      if (next !== kill) changes.push(`킬 ${kill ? 'ON' : 'OFF'}→${next ? 'ON' : 'OFF'}`)
      kill = next
    }

    if (changes.length === 0) continue

    const before = { g1: stock.g1, g2: stock.g2, g3s: stock.g3s, g4: stock.g4, kill: stock.kill }
    const after = { g1, g2, g3s, g4, kill }
    const judged = judgeStock(after)
    const stageStr = judged.judged
      ? `${STAGE_META[judged.stage].label}${judged.subtype ? ` ${judged.subtype}` : ''}(${judged.rule})`
      : '미판정'
    const note = `${today} [${lensLabel(lensType)}] '${postTitle}': ${changes.join(', ')} → ${stageStr}`

    await prisma.stock.update({
      where: { id: e.stockId },
      data: {
        g1,
        g2,
        g3s,
        g4,
        kill,
        stageNote: note.slice(0, 300),
        stageUpdatedAt: new Date(),
      },
    })

    // §7 이력 — 단계가 실제로 바뀐 경우만 기록
    await recordStageChange({
      stockId: e.stockId,
      ticker: stock.ticker,
      before,
      after,
      directCause: `[${lensLabel(lensType)}] '${postTitle}': ${changes.join(', ')}`,
      source: 'apply',
    })
  }
}
