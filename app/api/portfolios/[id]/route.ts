import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { portfolioSchema } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

async function ownedPortfolio(id: string, userId: string) {
  return prisma.portfolio.findFirst({ where: { id, userId } })
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: session.user.id },
    include: { transactions: { orderBy: { tradedAt: 'desc' } } },
  })
  if (!portfolio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ portfolio })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  if (!(await ownedPortfolio(id, session.user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = portfolioSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const portfolio = await prisma.portfolio.update({
    where: { id },
    data: parsed.data,
  })
  return NextResponse.json({ portfolio })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  if (!(await ownedPortfolio(id, session.user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await prisma.portfolio.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
