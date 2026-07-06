import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  // Verify ownership through the parent portfolio before deleting.
  const tx = await prisma.transaction.findFirst({
    where: { id, portfolio: { userId: session.user.id } },
  })
  if (!tx) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
