import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { refreshStockIndicator } from '@/lib/indicators'

type Params = { params: Promise<{ id: string }> }

/** 관리자가 종목 1개의 자동 지표(G1~G4 제안·차트·킬플래그)를 즉시 재계산. */
export async function POST(_req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const stock = await prisma.stock.findUnique({ where: { id }, select: { ticker: true } })
  if (!stock) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
  }
  const result = await refreshStockIndicator(id, stock.ticker)
  return NextResponse.json({ result })
}
