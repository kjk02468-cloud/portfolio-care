import { prisma } from '@/lib/prisma'
import { StockManager } from '@/components/admin/StockManager'

export const dynamic = 'force-dynamic'

export default async function AdminStocksPage() {
  const stocks = await prisma.stock.findMany({ orderBy: { ticker: 'asc' } })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">종목 관리</h1>
      <StockManager stocks={stocks} />
    </div>
  )
}
