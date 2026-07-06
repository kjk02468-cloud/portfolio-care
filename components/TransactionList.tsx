'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PortfolioTx } from '@/lib/data'
import { formatCurrency, formatNumber } from '@/lib/format'

export function TransactionList({
  transactions,
  currency = 'USD',
}: {
  transactions: PortfolioTx[]
  currency?: string
}) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function onDelete(id: string) {
    if (!confirm('이 거래를 삭제할까요?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-secondary">
        아직 거래 내역이 없습니다.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-secondary">
            <th className="px-4 py-3 font-medium">거래일</th>
            <th className="px-4 py-3 font-medium">종목</th>
            <th className="px-4 py-3 font-medium">구분</th>
            <th className="px-4 py-3 text-right font-medium">수량</th>
            <th className="px-4 py-3 text-right font-medium">단가</th>
            <th className="px-4 py-3 text-right font-medium">금액</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 tabular-nums text-secondary">
                {t.tradedAt.slice(0, 10)}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-primary">{t.symbol}</div>
                {t.name && <div className="text-xs text-muted">{t.name}</div>}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    t.side === 'BUY'
                      ? 'bg-gain/15 text-gain'
                      : 'bg-loss/15 text-loss'
                  }`}
                >
                  {t.side === 'BUY' ? '매수' : '매도'}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-secondary">
                {formatNumber(t.quantity)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-secondary">
                {formatCurrency(t.price, currency)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-primary">
                {formatCurrency(t.quantity * t.price, currency)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="text-xs text-muted transition hover:text-loss disabled:opacity-50"
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
