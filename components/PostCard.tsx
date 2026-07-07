import Link from 'next/link'
import type { FeedPost } from '@/lib/analysis'
import { lensLabel } from '@/lib/lens'

export function PostCard({
  post,
  delay = 0,
}: {
  post: FeedPost
  delay?: number
}) {
  return (
    <Link
      href={`/dashboard/feed/${post.id}`}
      className="card card-interactive animate-rise block p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs">
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
      <h2 className="font-semibold text-primary">{post.title}</h2>
      {post.lensSummary && (
        <p className="mt-1 text-xs font-medium text-brand">{post.lensSummary}</p>
      )}
      <p className="mt-1 line-clamp-2 text-sm text-secondary">{post.excerpt}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.stocks.map((s) => (
          <span
            key={s.id}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              s.held ? 'bg-brand/10 text-brand' : 'bg-surface-2 text-muted'
            }`}
          >
            {s.ticker}
            {s.held && ' · 보유'}
          </span>
        ))}
      </div>
    </Link>
  )
}
