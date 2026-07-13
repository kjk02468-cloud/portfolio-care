import { prisma } from '@/lib/prisma'
import { StockManager } from '@/components/admin/StockManager'
import { getModelPortfolio } from '@/lib/analysis'
import { PortfolioCompliance } from '@/components/PortfolioCompliance'

export const dynamic = 'force-dynamic'

export default async function AdminStocksPage() {
  const model = await getModelPortfolio()
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
      {model.positions.length > 0 && (
        <div className="card space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-primary">모델 포트폴리오 비중 점검</h2>
            <span className="text-sm tabular-nums text-secondary">
              합계 {model.totalWeight}%
            </span>
          </div>
          <PortfolioCompliance violations={model.violations} />
        </div>
      )}
      <StockManager stocks={stocks} />
    </div>
  )
}
