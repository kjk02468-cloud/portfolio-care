import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { lensLabel } from '@/lib/lens'
import { DeletePostButton } from '@/components/admin/DeletePostButton'

export const dynamic = 'force-dynamic'

export default async function AdminPostsPage() {
  const posts = await prisma.analysisPost.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { stocks: { select: { ticker: true } } },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">분석글</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong"
        >
          + 새 분석글
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-secondary">
          아직 작성한 분석글이 없어요.
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  p.status === 'published'
                    ? 'bg-gain/15 text-gain'
                    : 'bg-surface-2 text-muted'
                }`}
              >
                {p.status === 'published' ? '발행' : '초안'}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/posts/${p.id}`}
                  className="block truncate font-medium text-primary hover:underline"
                >
                  {p.title}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-secondary">
                    {lensLabel(p.lensType)}
                  </span>
                  {p.stocks.length > 0 && (
                    <span>{p.stocks.map((s) => s.ticker).join(', ')}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/admin/posts/${p.id}`}
                className="text-xs text-secondary transition hover:text-primary"
              >
                수정
              </Link>
              <DeletePostButton id={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
