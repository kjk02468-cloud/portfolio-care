import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { postSchema } from '@/lib/validation'
import { parseLensFields } from '@/lib/lens-fields'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const parsed = postSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  const { title, body, lensType, status, themeTags, stockIds, relatedIds } =
    parsed.data
  const lensFields = parseLensFields(lensType, parsed.data.lensFields)

  const existing = await prisma.analysisPost.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Stamp publishedAt the first time a post becomes published.
  const publishedAt =
    status === 'published'
      ? (existing.publishedAt ?? new Date())
      : existing.publishedAt

  const post = await prisma.analysisPost.update({
    where: { id },
    data: {
      title,
      body,
      lensType,
      status,
      themeTags: themeTags || null,
      lensFields: JSON.stringify(lensFields),
      publishedAt,
      stocks: { set: stockIds.map((sid) => ({ id: sid })) },
      // Never relate a post to itself.
      relatedTo: {
        set: relatedIds.filter((r) => r !== id).map((r) => ({ id: r })),
      },
    },
  })
  return NextResponse.json({ post })
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await prisma.analysisPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
