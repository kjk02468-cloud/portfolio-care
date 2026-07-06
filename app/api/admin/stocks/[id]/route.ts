import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { prisma } from '@/lib/prisma'
import { stockSchema } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const parsed = stockSchema.partial().safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { ticker, name, industry, sector } = parsed.data
  const stock = await prisma.stock.update({
    where: { id },
    data: {
      ...(ticker !== undefined ? { ticker } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(industry !== undefined ? { industry: industry || null } : {}),
      ...(sector !== undefined ? { sector: sector || null } : {}),
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
