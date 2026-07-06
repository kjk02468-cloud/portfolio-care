import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDashboardData } from '@/lib/data'
import { SummaryCards } from '@/components/SummaryCards'
import { HoldingsTable } from '@/components/HoldingsTable'
import { AllocationPieChart } from '@/components/AllocationPieChart'
import { ValueTrendChart } from '@/components/ValueTrendChart'
import { NewPortfolioButton } from '@/components/NewPortfolioButton'
import { formatCurrency, formatPercent, formatSignedCurrency } from '@/lib/format'

// Always render fresh so newly added transactions/quotes show immediately.
export const dynamic = 'force-dynamic'

function Panel({
  title,
  delay = 0,
  children,
}: {
  title: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <section
      className="card animate-rise p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="mb-4 font-semibold text-primary">{title}</h2>
      {children}
    </section>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const data = await getDashboardData(session.user.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">대시보드</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-secondary">
            전체 포트폴리오 요약
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                data.usingLiveData
                  ? 'bg-gain/15 text-gain'
                  : 'bg-surface-2 text-muted'
              }`}
            >
              {data.usingLiveData ? '실시간 시세' : '데모 시세'}
            </span>
          </p>
        </div>
        <NewPortfolioButton />
      </div>

      <SummaryCards summary={data.summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="자산 배분" delay={80}>
          <AllocationPieChart holdings={data.holdings} />
        </Panel>
        <Panel title="자산 추이" delay={140}>
          <ValueTrendChart data={data.trend} />
        </Panel>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">포트폴리오</h2>
        </div>
        {data.portfolios.length === 0 ? (
          <div className="card p-8 text-center text-secondary">
            포트폴리오가 없습니다. 위의 버튼으로 추가하세요.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.portfolios.map((p, i) => (
              <Link
                key={p.id}
                href={`/dashboard/portfolios/${p.id}`}
                className="card card-interactive animate-rise p-5"
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-primary">{p.name}</h3>
                  <span className="text-xs text-muted">{p.baseCurrency}</span>
                </div>
                <p className="mt-3 text-xl font-semibold tabular-nums text-primary">
                  {formatCurrency(p.summary.totalValue, p.baseCurrency)}
                </p>
                <p
                  className={`mt-1 text-sm tabular-nums ${
                    p.summary.totalUnrealizedPnl >= 0 ? 'text-gain' : 'text-loss'
                  }`}
                >
                  {formatSignedCurrency(
                    p.summary.totalUnrealizedPnl,
                    p.baseCurrency,
                  )}{' '}
                  ({formatPercent(p.summary.totalUnrealizedPnlPercent)})
                </p>
                <p className="mt-2 text-xs text-muted">
                  거래 {p.transactionCount}건 · 보유 {p.holdings.length}종목
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-primary">전체 보유 종목</h2>
        <HoldingsTable holdings={data.holdings} />
      </section>
    </div>
  )
}
