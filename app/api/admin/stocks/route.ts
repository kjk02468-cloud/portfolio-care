import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { stockSchema } from '@/lib/validation'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const stocks = await prisma.stock.findMany({ orderBy: { ticker: 'asc' } })
  return NextResponse.json({ stocks })
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const parsed = stockSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  const { ticker, name, industry, sector } = parsed.data
  const existing = await prisma.stock.findUnique({ where: { ticker } })
  if (existing) {
    return NextResponse.json(
      { error: '이미 등록된 티커예요.' },
      { status: 409 },
    )
  }
  const stock = await prisma.stock.create({
    data: {
      ticker,
      name,
      industry: industry || null,
      sector: sector || null,
    },
  })
  return NextResponse.json({ stock }, { status: 201 })
}
