import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PostEditor } from '@/components/admin/PostEditor'
import type { LensTypeValue } from '@/lib/lens'

export const dynamic = 'force-dynamic'

function parseInitialLensFields(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [post, stocks, posts] = await Promise.all([
    prisma.analysisPost.findUnique({
      where: { id },
      include: {
        stocks: { select: { id: true } },
        relatedTo: { select: { id: true } },
      },
    }),
    prisma.stock.findMany({
      orderBy: { ticker: 'asc' },
      select: { id: true, ticker: true, name: true },
    }),
    prisma.analysisPost.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, lensType: true },
    }),
  ])
  if (!post) notFound()

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/posts"
          className="text-sm text-muted transition hover:text-primary"
        >
          ← 분석글
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-primary">분석글 수정</h1>
      </div>
      <PostEditor
        stocks={stocks}
        relatedCandidates={posts}
        initial={{
          id: post.id,
          title: post.title,
          body: post.body,
          lensType: post.lensType as LensTypeValue,
          themeTags: post.themeTags ?? '',
          stockIds: post.stocks.map((s) => s.id),
          lensFields: parseInitialLensFields(post.lensFields),
          relatedIds: post.relatedTo.map((r) => r.id),
        }}
      />
    </div>
  )
}
