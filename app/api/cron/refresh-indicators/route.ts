import { NextResponse } from 'next/server'
import { refreshAllStockIndicators } from '@/lib/indicators'

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

  const results = await refreshAllStockIndicators()
  const failed = results.filter((r) => !r.indicatorComputed)
  return NextResponse.json({
    refreshed: results.length,
    succeeded: results.length - failed.length,
    failed: failed.map((r) => r.ticker),
  })
}
