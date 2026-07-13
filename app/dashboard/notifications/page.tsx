import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getNotifications } from '@/lib/notifications'
import { MarkAllReadButton } from '@/components/MarkAllReadButton'

export const dynamic = 'force-dynamic'

function formatStamp(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const items = await getNotifications(session.user.id)
  const unread = items.filter((n) => !n.read).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">알림</h1>
          <p className="mt-1 text-sm text-secondary">
            단계 변경·이탈(킬)·모니터링 알림이에요.
            {unread > 0 ? ` 안 읽은 알림 ${unread}건.` : ''}
          </p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-secondary">아직 알림이 없어요.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`card p-4 ${n.read ? 'opacity-70' : ''} ${
                n.urgent ? 'border-loss/40' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                <span
                  className={`font-medium ${n.urgent ? 'text-loss' : 'text-primary'}`}
                >
                  {n.title}
                </span>
                {n.ticker && (
                  <Link
                    href={`/dashboard/stages`}
                    className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-secondary hover:text-primary"
                  >
                    {n.ticker}
                  </Link>
                )}
                <span className="ml-auto text-xs tabular-nums text-muted">
                  {formatStamp(n.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-secondary">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
