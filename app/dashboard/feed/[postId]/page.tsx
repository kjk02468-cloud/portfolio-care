import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPostForSubscriber } from '@/lib/analysis'
import { lensLabel } from '@/lib/lens'
import { PostBody } from '@/components/PostBody'
import { LensFieldsView } from '@/components/LensFieldsView'

export const dynamic = 'force-dynamic'

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { postId } = await params
  const post = await getPostForSubscriber(postId, session.user.id)
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/dashboard/feed"
          className="text-sm text-muted transition hover:text-primary"
        >
          ← 분석 피드
        </Link>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">
            {lensLabel(post.lensType)}
          </span>
          {post.publishedAt && (
            <span className="text-muted">{post.publishedAt.slice(0, 10)}</span>
          )}
          {post.authorName && (
            <span className="text-muted">· {post.authorName}</span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-primary">{post.title}</h1>
      </div>

      {/* "이 분석이 네 OOO에 영향" — highlight held tickers */}
      {post.heldTickers.length > 0 && (
        <div className="card p-4">
          <p className="text-sm text-secondary">
            이 분석은 당신이 보유한{' '}
            <span className="font-semibold text-brand">
              {post.heldTickers.join(', ')}
            </span>
            에 영향을 줄 수 있어요.
          </p>
        </div>
      )}

      {/* lens_fields — structured per-lens details */}
      <LensFieldsView lensType={post.lensType} fields={post.lensFields} />

      {/* ticker_tags */}
      {post.stocks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.stocks.map((s) => (
            <span
              key={s.id}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                s.held ? 'bg-brand/10 text-brand' : 'bg-surface-2 text-muted'
              }`}
            >
              {s.ticker}
              {s.held && ' · 보유'}
            </span>
          ))}
        </div>
      )}

      <div className="card p-6">
        <PostBody>{post.body}</PostBody>
      </div>

      {post.themeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          테마:
          {post.themeTags.map((t) => (
            <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-secondary">
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
