import { prisma } from '@/lib/prisma'
import { StockManager } from '@/components/admin/StockManager'

export const dynamic = 'force-dynamic'

export default async function AdminStocksPage() {
  const rows = await prisma.stock.findMany({
    orderBy: { ticker: 'asc' },
    include: {
      autoIndicator: true,
      quarterlyReports: { orderBy: { periodEnd: 'desc' }, take: 8 },
    },
  })
  // DateTime → ISO 문자열로 직렬화 (lib/analysis.ts와 동일한 관례).
  const stocks = rows.map((s) => ({
    ...s,
    stageUpdatedAt: s.stageUpdatedAt ? s.stageUpdatedAt.toISOString() : null,
    autoIndicator: s.autoIndicator
      ? {
          ...s.autoIndicator,
          asOf: s.autoIndicator.asOf.toISOString(),
          computedAt: s.autoIndicator.computedAt.toISOString(),
        }
      : null,
    quarterlyReports: s.quarterlyReports.map((r) => ({
      ...r,
      periodEnd: r.periodEnd.toISOString(),
      reportedAt: r.reportedAt ? r.reportedAt.toISOString() : null,
    })),
  }))

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">종목 관리</h1>
      <StockManager stocks={stocks} />
    </div>
  )
}
