import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { transactionSchema } from '@/lib/validation'
import { z } from 'zod'

const createSchema = transactionSchema.extend({
  portfolioId: z.string().min(1),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const portfolioId = searchParams.get('portfolioId')
  if (!portfolioId) {
    return NextResponse.json({ error: 'portfolioId required' }, { status: 400 })
  }
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  })
  if (!portfolio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const transactions = await prisma.transaction.findMany({
    where: { portfolioId },
    orderBy: { tradedAt: 'desc' },
  })
  return NextResponse.json({ transactions })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }

  const { portfolioId, name, ...rest } = parsed.data
  // Ensure the target portfolio belongs to the current user.
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: session.user.id },
  })
  if (!portfolio) {
    return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
  }

  const transaction = await prisma.transaction.create({
    data: {
      portfolioId,
      name: name && name.length > 0 ? name : null,
      ...rest,
    },
  })

  return NextResponse.json({ transaction }, { status: 201 })
}
