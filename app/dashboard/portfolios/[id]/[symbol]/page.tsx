import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getHoldingDetail } from '@/lib/data'
import { getStockPosts } from '@/lib/analysis'
import { lensLabel } from '@/lib/lens'
import { TransactionList } from '@/components/TransactionList'
import { CostVsPriceBar } from '@/components/CostVsPriceBar'
import { PostCard } from '@/components/PostCard'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
} from '@/lib/format'

export const dynamic = 'force-dynamic'

const assetTypeLabels: Record<string, string> = {
  STOCK: '주식',
  ETF: 'ETF',
  CRYPTO: '암호화폐',
  FUND: '펀드',
  OTHER: '기타',
}

function Stat({
  label,
  children,
  valueClass = 'text-primary',
}: {
  label: string
  children: React.ReactNode
  valueClass?: string
}) {
  return (
    <div>
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums ${valueClass}`}>
        {children}
      </dd>
    </div>
  )
}

export default async function HoldingDetailPage({
  params,
}: {
  params: Promise<{ id: string; symbol: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id, symbol } = await params
  const detail = await getHoldingDetail(id, symbol, session.user.id)
  if (!detail) notFound()

  const { portfolio, holding, quote, transactions, tradeSummary } = detail
  const currency = portfolio.baseCurrency
  const lensGroups = await getStockPosts(detail.symbol, session.user.id)
  const name = holding?.name ?? transactions.find((t) => t.name)?.name ?? null
  const assetType = holding?.assetType ?? 'STOCK'

  const price = quote?.price ?? holding?.currentPrice ?? 0
  const dayChange = quote?.change ?? 0
  const dayChangePercent = quote?.changePercent ?? 0
  const isLive = quote?.source === 'finnhub'
  const gainDay = dayChange >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/portfolios/${portfolio.id}`}
          className="text-sm text-muted transition hover:text-primary"
        >
          ← {portfolio.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-primary">{detail.symbol}</h1>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-secondary">
                {assetTypeLabels[assetType] ?? assetType}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isLive ? 'bg-gain/15 text-gain' : 'bg-surface-2 text-muted'
                }`}
              >
                {isLive ? '실시간 시세' : '데모 시세'}
              </span>
            </div>
            {name && <p className="mt-0.5 text-sm text-muted">{name}</p>}
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold tracking-tight tabular-nums text-primary">
              {formatCurrency(price, currency)}
            </div>
            <div
              className={`text-sm tabular-nums ${gainDay ? 'text-gain' : 'text-loss'}`}
            >
              {gainDay ? '▲' : '▼'} {formatSignedCurrency(dayChange, currency)} (
              {formatPercent(dayChangePercent)}) 오늘
            </div>
          </div>
        </div>
      </div>

      {/* My position */}
      <section className="card animate-rise p-5">
        <h2 className="mb-4 font-semibold text-primary">내 포지션</h2>
        {holding && holding.quantity > 0 ? (
          <>
            <div className="mb-5">
              <p className="text-sm text-secondary">평가금액</p>
              <AnimatedNumber
                value={holding.marketValue}
                currency={currency}
                className="block text-3xl font-bold tracking-tight tabular-nums text-primary"
              />
              <p
                className={`mt-1 text-sm tabular-nums ${
                  holding.unrealizedPnl >= 0 ? 'text-gain' : 'text-loss'
                }`}
              >
                {formatSignedCurrency(holding.unrealizedPnl, currency)} (
                {formatPercent(holding.unrealizedPnlPercent)})
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="보유수량">{formatNumber(holding.quantity)}</Stat>
              <Stat label="평균단가">
                {formatCurrency(holding.avgCost, currency)}
              </Stat>
              <Stat label="투자원금">
                {formatCurrency(holding.costBasis, currency)}
              </Stat>
              <Stat label="포트폴리오 내 비중">
                {(holding.weight * 100).toFixed(1)}%
              </Stat>
              <Stat
                label="실현 손익"
                valueClass={
                  holding.realizedPnl >= 0 ? 'text-gain' : 'text-loss'
                }
              >
                {formatSignedCurrency(holding.realizedPnl, currency)}
              </Stat>
            </dl>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-secondary">
              현재 보유 수량이 없어요. 지난 거래로 확정된 실현 손익만 남아 있어요.
            </p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat
                label="실현 손익"
                valueClass={
                  (holding?.realizedPnl ?? 0) >= 0 ? 'text-gain' : 'text-loss'
                }
              >
                {formatSignedCurrency(holding?.realizedPnl ?? 0, currency)}
              </Stat>
            </dl>
          </div>
        )}
      </section>

      {/* Cost vs price */}
      {holding && holding.quantity > 0 && (
        <section className="card animate-rise p-5" style={{ animationDelay: '60ms' }}>
          <h2 className="mb-4 font-semibold text-primary">평단가 vs 현재가</h2>
          <CostVsPriceBar
            avgCost={holding.avgCost}
            currentPrice={holding.currentPrice}
            currency={currency}
          />
        </section>
      )}

      {/* Trade summary */}
      <section className="card animate-rise p-5" style={{ animationDelay: '120ms' }}>
        <h2 className="mb-4 font-semibold text-primary">매매 요약</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="총 매수액">
            {formatCurrency(tradeSummary.totalBought, currency)}
          </Stat>
          <Stat label="총 매도액">
            {formatCurrency(tradeSummary.totalSold, currency)}
          </Stat>
          <Stat label="총 수수료">
            {formatCurrency(tradeSummary.totalFees, currency)}
          </Stat>
          <Stat label="매수 / 매도">
            {tradeSummary.buyCount} / {tradeSummary.sellCount}건
          </Stat>
          <Stat label="첫 매수일">
            {tradeSummary.firstTradeAt
              ? tradeSummary.firstTradeAt.slice(0, 10)
              : '-'}
          </Stat>
        </dl>
      </section>

      {/* Analysis for this symbol, grouped by lens */}
      <section className="space-y-4">
        <h2 className="font-semibold text-primary">이 종목 분석</h2>
        {lensGroups.length === 0 ? (
          <div className="card p-8 text-center text-secondary">
            아직 이 종목에 연결된 분석이 없어요.
          </div>
        ) : (
          lensGroups.map((group) => (
            <div key={group.lensType} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                  {lensLabel(group.lensType)}
                </span>
                <span className="text-xs text-muted">
                  {group.posts.length}건
                </span>
              </div>
              <div className="space-y-3">
                {group.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Transactions for this symbol */}
      <section className="space-y-3">
        <h2 className="font-semibold text-primary">이 종목 거래 내역</h2>
        <TransactionList transactions={transactions} currency={currency} />
      </section>
    </div>
  )
}
