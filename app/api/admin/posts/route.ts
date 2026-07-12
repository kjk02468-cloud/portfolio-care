import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { postSchema } from '@/lib/validation'
import { parseLensFields } from '@/lib/lens-fields'
import {
  missingRequiredJudgements,
  JUDGE_FIELD_LABELS,
} from '@/lib/report-templates'
import { applyStageUpdates } from '@/lib/stage-apply'

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
  const {
    title,
    body,
    lensType,
    status,
    themeTags,
    stockIds,
    relatedIds,
    stageUpdates,
  } = parsed.data
  const lensFields = parseLensFields(lensType, parsed.data.lensFields)
  const updates = stageUpdates.filter((u) => stockIds.includes(u.stockId))

  // 발행 시 렌즈별 필수 판정 응답 강제 (임시저장은 자유)
  if (status === 'published') {
    const missing = missingRequiredJudgements(lensType, stockIds, updates)
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `발행하려면 태그 종목마다 ${JUDGE_FIELD_LABELS[missing[0].field]} 응답이 필요해요.` },
        { status: 400 },
      )
    }
  }

  const post = await prisma.analysisPost.create({
    data: {
      title,
      body,
      lensType,
      status,
      themeTags: themeTags || null,
      lensFields: JSON.stringify(lensFields),
      stageUpdates: JSON.stringify(updates),
      authorId: admin.id,
      publishedAt: status === 'published' ? new Date() : null,
      stocks: { connect: stockIds.map((id) => ({ id })) },
      relatedTo: { connect: relatedIds.map((id) => ({ id })) },
    },
  })

  // 최초 발행 → 판정 반영 (경로 A)
  if (status === 'published') {
    await applyStageUpdates(updates, title, lensType)
  }

  return NextResponse.json({ post }, { status: 201 })
}
