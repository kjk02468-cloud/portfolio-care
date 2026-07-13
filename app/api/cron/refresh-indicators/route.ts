import { NextResponse } from 'next/server'
import { refreshAllStockIndicators } from '@/lib/indicators'
import { notifyCronFailure } from '@/lib/notifications'

// Vercel Cron이 매일 호출 — 전 종목 G4/차트/G1~G3 제안값·킬신호를 갱신.
// Vercel은 요청에 Authorization: Bearer <CRON_SECRET> 헤더를 붙여 보낸다(공식 패턴).
// CRON_SECRET을 설정하지 않으면 이 라우트는 막힌다 — 공개 URL로 아무나 트리거하지
// 못하게 하기 위함(무료 티어 벤더 쿼터 보호 포함).
export const maxDuration = 300 // 종목 수가 많아지면 순차 처리 시간이 늘어남

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await refreshAllStockIndicators()
    const failed = results.filter((r) => !r.indicatorComputed)
    // 일부 종목 지표 계산 실패 → 관리자에게 경고 알림(전체 크론은 성공으로 반환).
    if (failed.length > 0) {
      await notifyCronFailure(
        `${results.length}종목 중 ${failed.length}종목 지표 계산 실패: ${failed
          .map((r) => r.ticker)
          .join(', ')}`,
      )
    }
    return NextResponse.json({
      refreshed: results.length,
      succeeded: results.length - failed.length,
      failed: failed.map((r) => r.ticker),
    })
  } catch (err) {
    // 크론 전체 실패 → 관리자 알림 후 500. Vercel 로그에도 남긴다.
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    console.error('[cron] refresh-indicators failed', err)
    await notifyCronFailure(`자동 지표 갱신이 중단됐어요: ${msg}`).catch(() => {})
    return NextResponse.json({ error: `Refresh failed: ${msg}` }, { status: 500 })
  }
}
