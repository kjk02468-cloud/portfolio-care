'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewPortfolioButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Quotes are USD-only for now, so every portfolio is valued in USD.
        // The currency field stays in the schema for a future FX/KR-market build.
        body: JSON.stringify({ name, baseCurrency: 'USD' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '생성에 실패했습니다.')
      }
      setName('')
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
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-2"
      >
        + 포트폴리오 추가
      </button>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card flex flex-wrap items-end gap-2 p-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-secondary">
          이름
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="퇴직연금 계좌"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-secondary">
          통화
        </span>
        <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
          USD
        </div>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:bg-brand-strong disabled:opacity-60"
      >
        {loading ? '생성 중…' : '생성'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-secondary hover:text-primary"
      >
        취소
      </button>
      {error && <p className="w-full text-sm text-loss">{error}</p>}
    </form>
  )
}
