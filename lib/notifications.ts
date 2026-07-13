import { prisma } from './prisma'

// 알림 생성 (W5). 단계 변경·킬·크론 실패를 인앱 알림으로 전달한다.
// 원칙: 일반 단계 변경은 그 종목 보유자에게, 킬(이탈)은 전체 구독자에게(긴급),
// 크론 실패는 관리자에게. 어느 경우도 실패해도 상위 흐름(판정·크론)을 막지 않는다.

/** 티커를 (거래내역 기준) 보유한 구독자 userId 목록. */
async function holderUserIds(ticker: string): Promise<string[]> {
  const rows = await prisma.transaction.findMany({
    where: { symbol: { equals: ticker.toUpperCase() } },
    select: { portfolio: { select: { userId: true } } },
  })
  return [...new Set(rows.map((r) => r.portfolio.userId))]
}

async function allSubscriberIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ select: { id: true } })
  return rows.map((r) => r.id)
}

async function adminIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  return rows.map((r) => r.id)
}

async function fanOut(
  userIds: string[],
  data: { kind: string; title: string; body: string; ticker?: string | null; urgent?: boolean },
): Promise<number> {
  if (userIds.length === 0) return 0
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        kind: data.kind,
        title: data.title,
        body: data.body,
        ticker: data.ticker ?? null,
        urgent: data.urgent ?? false,
      })),
    })
    return userIds.length
  } catch (err) {
    console.error('[notifications] fanOut failed', err)
    return 0
  }
}

/**
 * 단계가 바뀌었을 때 알림을 생성한다(recordStageChange가 로그를 남긴 직후 호출).
 * 이탈(킬)로의 전이는 전체 구독자에게 긴급 알림, 그 외는 보유자에게만.
 */
export async function notifyStageChange(args: {
  ticker: string
  fromLabel: string
  toLabel: string
  directCause: string
}): Promise<number> {
  const isKill = args.toLabel === '이탈'
  const recipients = isKill ? await allSubscriberIds() : await holderUserIds(args.ticker)
  return fanOut(recipients, {
    kind: isKill ? 'kill' : 'stage_change',
    title: isKill
      ? `⚠ ${args.ticker} 이탈(킬) 발생`
      : `${args.ticker} 단계 변경: ${args.fromLabel} → ${args.toLabel}`,
    body: args.directCause,
    ticker: args.ticker.toUpperCase(),
    urgent: isKill,
  })
}

/** 크론(자동 지표 갱신) 실패·이상을 관리자에게 알린다. */
export async function notifyCronFailure(summary: string): Promise<number> {
  return fanOut(await adminIds(), {
    kind: 'cron_failure',
    title: '자동 지표 갱신 경고',
    body: summary,
    urgent: true,
  })
}

// ── 읽기 (구독자 피드·뱃지) ─────────────────────────────────────────────────

export interface NotificationView {
  id: string
  kind: string
  title: string
  body: string
  ticker: string | null
  urgent: boolean
  read: boolean
  createdAt: string
}

export async function getNotifications(userId: string, limit = 50): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    ticker: n.ticker,
    urgent: n.urgent,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } })
}

/** 특정 알림(ids) 또는 전체를 읽음 처리. 본인 알림만. */
export async function markRead(userId: string, ids?: string[]): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { userId, ...(ids && ids.length > 0 ? { id: { in: ids } } : {}), read: false },
    data: { read: true },
  })
  return res.count
}
