'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const assetTypes = [
  { value: 'STOCK', label: '주식' },
  { value: 'ETF', label: 'ETF' },
  { value: 'CRYPTO', label: '암호화폐' },
  { value: 'FUND', label: '펀드' },
  { value: 'OTHER', label: '기타' },
]

export function TransactionForm({ portfolioId }: { portfolioId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState('STOCK')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('')
  const [tradedAt, setTradedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setSymbol('')
    setName('')
    setQuantity('')
    setPrice('')
    setFee('')
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          symbol,
          name,
          assetType,
          side,
          quantity,
          price,
          fee: fee || 0,
          tradedAt,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '거래 저장에 실패했습니다.')
      }
      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong"
      >
        + 거래 추가
      </button>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-primary">거래 추가</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted hover:text-primary"
        >
          닫기
        </button>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-border p-0.5">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              side === s
                ? s === 'BUY'
                  ? 'bg-gain/15 text-gain'
                  : 'bg-loss/15 text-loss'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {s === 'BUY' ? '매수' : '매도'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="종목 코드">
          <input
            required
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className={inputCls}
          />
        </Field>
        <Field label="종목명 (선택)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Apple Inc."
            className={inputCls}
          />
        </Field>
        <Field label="자산 유형">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className={inputCls}
          >
            {assetTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="거래일">
          <input
            type="date"
            value={tradedAt}
            onChange={(e) => setTradedAt(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="수량">
          <input
            required
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
            className={inputCls}
          />
        </Field>
        <Field label="단가">
          <input
            required
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150.00"
            className={inputCls}
          />
        </Field>
        <Field label="수수료 (선택)">
          <input
            type="number"
            step="any"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong disabled:opacity-60"
        >
          {loading ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-secondary transition hover:text-primary"
        >
          취소
        </button>
      </div>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-secondary">
        {label}
      </span>
      {children}
    </label>
  )
}
