import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PostEditor } from '@/components/admin/PostEditor'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const [stocks, posts] = await Promise.all([
    prisma.stock.findMany({
      orderBy: { ticker: 'asc' },
      select: { id: true, ticker: true, name: true },
    }),
    prisma.analysisPost.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, lensType: true },
    }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/posts"
          className="text-sm text-muted transition hover:text-primary"
        >
          ← 분석글
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-primary">새 분석글</h1>
      </div>
      <PostEditor stocks={stocks} relatedCandidates={posts} />
    </div>
  )
}
