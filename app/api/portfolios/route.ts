import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { portfolioSchema } from '@/lib/validation'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { transactions: true } } },
  })

  return NextResponse.json({ portfolios })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = portfolioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }

  const portfolio = await prisma.portfolio.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      // Market quotes are USD-only, so pin every portfolio to USD to avoid
      // summing mismatched currencies on the dashboard. Revisit when FX and
      // non-USD market data are added.
      baseCurrency: 'USD',
    },
  })

  return NextResponse.json({ portfolio }, { status: 201 })
}
