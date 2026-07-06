import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getFeed, getMyTickers } from '@/lib/analysis'
import { lensLabel } from '@/lib/lens'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [feed, tickers] = await Promise.all([
    getFeed(session.user.id),
    getMyTickers(session.user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">분석 피드</h1>
        <p className="mt-1 text-sm text-secondary">
          내 보유 종목에 연결된 최신 분석이에요.
        </p>
      </div>

      {tickers.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-secondary">
            보유 종목이 없어요. 거래를 추가하면 그 종목에 달린 분석이 여기에 떠요.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong"
          >
            포트폴리오로 가기
          </Link>
        </div>
      ) : feed.length === 0 ? (
        <div className="card p-8 text-center text-secondary">
          아직 내 종목({tickers.join(', ')})에 연결된 분석이 없어요.
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post, i) => (
            <Link
              key={post.id}
              href={`/dashboard/feed/${post.id}`}
              className="card card-interactive animate-rise block p-5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">
                  {lensLabel(post.lensType)}
                </span>
                {post.publishedAt && (
                  <span className="text-muted">
                    {post.publishedAt.slice(0, 10)}
                  </span>
                )}
                {post.authorName && (
                  <span className="text-muted">· {post.authorName}</span>
                )}
              </div>
              <h2 className="font-semibold text-primary">{post.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-secondary">
                {post.excerpt}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.stocks.map((s) => (
                  <span
                    key={s.id}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.held
                        ? 'bg-brand/10 text-brand'
                        : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {s.ticker}
                    {s.held && ' · 보유'}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
