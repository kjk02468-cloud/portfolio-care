import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getPortfolioView } from '@/lib/data'
import { SummaryCards } from '@/components/SummaryCards'
import { HoldingsTable } from '@/components/HoldingsTable'
import { AllocationPieChart } from '@/components/AllocationPieChart'
import { TransactionForm } from '@/components/TransactionForm'
import { TransactionList } from '@/components/TransactionList'

export const dynamic = 'force-dynamic'

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const result = await getPortfolioView(id, session.user.id)
  if (!result) notFound()

  const { view, transactions } = result
  const currency = view.baseCurrency

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted transition hover:text-primary"
        >
          ← 대시보드
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-primary">
            {view.name}
            <span className="ml-2 text-sm font-normal text-muted">
              {currency}
            </span>
          </h1>
          <TransactionForm portfolioId={view.id} />
        </div>
      </div>

      <SummaryCards summary={view.summary} currency={currency} />

      {view.holdings.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-primary">자산 배분</h2>
          <AllocationPieChart holdings={view.holdings} currency={currency} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-primary">보유 종목</h2>
        <HoldingsTable holdings={view.holdings} currency={currency} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-primary">거래 내역</h2>
        <TransactionList transactions={transactions} currency={currency} />
      </section>
    </div>
  )
}
