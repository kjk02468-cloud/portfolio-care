'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LENS_TYPES, LENS_LABELS, type LensTypeValue } from '@/lib/lens'
import { LensFieldsEditor } from './LensFieldsEditor'

interface StockOption {
  id: string
  ticker: string
  name: string
}

export interface PostEditorInitial {
  id: string
  title: string
  body: string
  lensType: LensTypeValue
  themeTags: string
  stockIds: string[]
  lensFields: Record<string, unknown>
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

export function PostEditor({
  stocks,
  initial,
}: {
  stocks: StockOption[]
  initial?: PostEditorInitial
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [lensType, setLensType] = useState<LensTypeValue>(
    initial?.lensType ?? 'earnings',
  )
  const [themeTags, setThemeTags] = useState(initial?.themeTags ?? '')
  const [stockIds, setStockIds] = useState<string[]>(initial?.stockIds ?? [])
  const [lensFields, setLensFields] = useState<Record<string, unknown>>(
    initial?.lensFields ?? {},
  )
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = filter.trim().toUpperCase()
    if (!q) return stocks
    return stocks.filter(
      (s) => s.ticker.includes(q) || s.name.toUpperCase().includes(q),
    )
  }, [stocks, filter])

  function toggle(id: string) {
    setStockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function save(status: 'draft' | 'published') {
    setError(null)
    setLoading(true)
    try {
      const payload = {
        title,
        body,
        lensType,
        status,
        themeTags,
        stockIds,
        lensFields,
      }
      const res = await fetch(
        initial ? `/api/admin/posts/${initial.id}` : '/api/admin/posts',
        {
          method: initial ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '저장에 실패했어요.')
      }
      router.push('/admin/posts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const selected = stocks.filter((s) => stockIds.includes(s.id))

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-secondary">
          제목
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="분석 제목"
          className={inputCls}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">
            렌즈 타입
          </span>
          <select
            value={lensType}
            onChange={(e) => setLensType(e.target.value as LensTypeValue)}
            className={inputCls}
          >
            {LENS_TYPES.map((t) => (
              <option key={t} value={t}>
                {LENS_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">
            테마 태그 (쉼표로 구분)
          </span>
          <input
            value={themeTags}
            onChange={(e) => setThemeTags(e.target.value)}
            placeholder="HBM, AI, 2차전지"
            className={inputCls}
          />
        </label>
      </div>

      {/* ticker_tags */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-secondary">
          종목 태그 (ticker_tags)
        </span>
        {selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
              >
                {s.ticker} ✕
              </button>
            ))}
          </div>
        )}
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="티커/이름 검색"
          className={`${inputCls} mb-2`}
        />
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted">
              종목이 없어요. 먼저 종목을 등록하세요.
            </p>
          ) : (
            filtered.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 py-2 text-sm last:border-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={stockIds.includes(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span className="font-medium text-primary">{s.ticker}</span>
                <span className="text-muted">{s.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <LensFieldsEditor
        lensType={lensType}
        value={lensFields}
        onChange={setLensFields}
      />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-secondary">
          본문 (마크다운)
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder={'## 핵심\n분석 본문을 마크다운으로 작성하세요.'}
          className={`${inputCls} font-mono text-sm`}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => save('published')}
          className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-fg transition hover:bg-brand-strong disabled:opacity-60"
        >
          {loading ? '처리 중…' : '발행'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => save('draft')}
          className="rounded-lg border border-border px-5 py-2.5 font-medium text-secondary transition hover:text-primary disabled:opacity-60"
        >
          임시저장
        </button>
      </div>
    </div>
  )
}
