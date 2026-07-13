import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getNotifications, unreadCount, markRead } from '@/lib/notifications'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [items, unread] = await Promise.all([
    getNotifications(session.user.id),
    unreadCount(session.user.id),
  ])
  return NextResponse.json({ items, unread })
}

// 읽음 처리: { ids?: string[] } — 비우면 전체 읽음.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown }
  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === 'string') : undefined
  const count = await markRead(session.user.id, ids)
  return NextResponse.json({ marked: count })
}
