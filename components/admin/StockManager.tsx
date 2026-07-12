'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StockStagePanel } from './StockStagePanel'

interface Stock {
  id: string
  ticker: string
  name: string
  industry: string | null
  sector: string | null
  g1: number | null
  g2: number | null
  g3s: number | null
  g4: number | null
  kill: boolean
  stageNote: string | null
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

export function StockManager({ stocks }: { stocks: Stock[] }) {
  const router = useRouter()
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [sector, setSector] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function addStock(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, name, industry, sector }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '등록에 실패했어요.')
      }
      setTicker('')
      setName('')
      setIndustry('')
      setSector('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('이 종목을 삭제할까요? 연결된 분석글의 태그에서도 제거돼요.')) return
    const res = await fetch(`/api/admin/stocks/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addStock} className="card space-y-3 p-4">
        <h2 className="font-semibold text-primary">종목 추가</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            required
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="티커 (AAPL)"
            className={inputCls}
          />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="종목명"
            className={inputCls}
          />
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="산업 (선택)"
            className={inputCls}
          />
          <input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="섹터 (선택)"
            className={inputCls}
          />
        </div>
        {error && <p className="text-sm text-loss">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong disabled:opacity-60"
        >
          {loading ? '추가 중…' : '추가'}
        </button>
      </form>

      {stocks.length === 0 ? (
        <div className="card p-8 text-center text-secondary">
          아직 등록된 종목이 없어요.
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {stocks.map((s) => (
            <div key={s.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-20 shrink-0 font-medium text-primary">
                  {s.ticker}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-primary">{s.name}</div>
                  <div className="text-xs text-muted">
                    {[s.sector, s.industry].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-xs text-muted transition hover:text-loss"
                >
                  삭제
                </button>
              </div>
              <div className="mt-2 pl-0 sm:pl-20">
                <StockStagePanel
                  stock={{
                    id: s.id,
                    ticker: s.ticker,
                    g1: s.g1,
                    g2: s.g2,
                    g3s: s.g3s,
                    g4: s.g4,
                    kill: s.kill,
                    stageNote: s.stageNote,
                  }}
                />
                {s.stageNote && (
                  <p className="mt-1.5 text-xs text-muted">{s.stageNote}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
