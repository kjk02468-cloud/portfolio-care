import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getFeed, getLensBrowse, getMyTickers } from '@/lib/analysis'
import { LENS_TYPES, lensLabel, type LensTypeValue } from '@/lib/lens'
import { LensTabs } from '@/components/LensTabs'
import { PostCard } from '@/components/PostCard'

export const dynamic = 'force-dynamic'

function scopeHref(scope: 'mine' | 'all', lens: LensTypeValue | null) {
  const params = new URLSearchParams()
  if (lens) params.set('lens', lens)
  if (scope === 'all') params.set('scope', 'all')
  const qs = params.toString()
  return `/dashboard/feed${qs ? `?${qs}` : ''}`
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ lens?: string; scope?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sp = await searchParams
  const lens = LENS_TYPES.includes(sp.lens as LensTypeValue)
    ? (sp.lens as LensTypeValue)
    : null
  const scope: 'mine' | 'all' = sp.scope === 'all' ? 'all' : 'mine'

  const [posts, tickers] = await Promise.all([
    scope === 'all'
      ? getLensBrowse(session.user.id, lens ?? undefined)
      : getFeed(session.user.id, lens ?? undefined),
    getMyTickers(session.user.id),
  ])

  const lensName = lens ? lensLabel(lens) : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">분석 피드</h1>
        <p className="mt-1 text-sm text-secondary">
          {scope === 'all'
            ? '발행된 모든 분석이에요. 내 보유 종목이 태그된 글이 위로 와요.'
            : '내 보유 종목에 연결된 최신 분석이에요.'}
        </p>
      </div>

      {/* scope toggle */}
      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
        {(['mine', 'all'] as const).map((s) => (
          <Link
            key={s}
            href={scopeHref(s, lens)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              scope === s
                ? 'bg-surface-2 text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {s === 'mine' ? '내 종목' : '전체'}
          </Link>
        ))}
      </div>

      <LensTabs current={lens} scope={scope} />

      {scope === 'mine' && tickers.length === 0 ? (
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
      ) : posts.length === 0 ? (
        <div className="card p-8 text-center text-secondary">
          {scope === 'all'
            ? `아직 발행된 ${lensName} 분석이 없어요.`
            : `아직 내 종목에 연결된 ${lensName} 분석이 없어요.`}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} delay={i * 50} />
          ))}
        </div>
      )}
    </div>
  )
}
