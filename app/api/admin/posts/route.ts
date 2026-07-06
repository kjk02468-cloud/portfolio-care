import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { postSchema } from '@/lib/validation'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const posts = await prisma.analysisPost.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { stocks: { select: { ticker: true } } },
  })
  return NextResponse.json({ posts })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const parsed = postSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  const { title, body, lensType, status, themeTags, stockIds } = parsed.data

  const post = await prisma.analysisPost.create({
    data: {
      title,
      body,
      lensType,
      status,
      themeTags: themeTags || null,
      authorId: admin.id,
      publishedAt: status === 'published' ? new Date() : null,
      stocks: { connect: stockIds.map((id) => ({ id })) },
    },
  })
  return NextResponse.json({ post }, { status: 201 })
}
