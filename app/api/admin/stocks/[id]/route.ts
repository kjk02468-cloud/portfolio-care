import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { stockSchema, stockStageSchema } from '@/lib/validation'
import { recordStageChange } from '@/lib/stage-history'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = (await req.json().catch(() => null)) as { stage?: unknown } | null

  // 경로 B: G값 직접 수정 (분기 기준일 보정 등, §A.10)
  if (body && typeof body === 'object' && 'stage' in body) {
    const parsed = stockStageSchema.safeParse(body.stage)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid stage input' }, { status: 400 })
    }
    const { g1, g2, g3s, g4, kill, stageNote } = parsed.data
    const existing = await prisma.stock.findUnique({
      where: { id },
      select: { g1: true, g2: true, g3s: true, g4: true, kill: true, ticker: true },
    })
    const stock = await prisma.stock.update({
      where: { id },
      data: {
        g1,
        g2,
        g3s,
        g4,
        kill,
        stageNote: stageNote || null,
        stageUpdatedAt: new Date(),
      },
    })
    // §7 이력 — 수동 보정으로 단계가 바뀐 경우만 기록
    if (existing) {
      await recordStageChange({
        stockId: id,
        ticker: existing.ticker,
        before: existing,
        after: { g1, g2, g3s, g4, kill },
        directCause: stageNote || '수동 보정 (종목 관리)',
        source: 'admin',
      })
    }
    return NextResponse.json({ stock })
  }

  const parsed = stockSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { ticker, name, industry, sector, industryProfile, fundingLine, modelWeight } = parsed.data
  const stock = await prisma.stock.update({
    where: { id },
    data: {
      ...(ticker !== undefined ? { ticker } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(industry !== undefined ? { industry: industry || null } : {}),
      ...(sector !== undefined ? { sector: sector || null } : {}),
      ...(industryProfile !== undefined ? { industryProfile: industryProfile || null } : {}),
      ...(fundingLine !== undefined ? { fundingLine: fundingLine || null } : {}),
      ...(modelWeight !== undefined ? { modelWeight: modelWeight } : {}),
    },
  })
  return NextResponse.json({ stock })
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await prisma.stock.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
