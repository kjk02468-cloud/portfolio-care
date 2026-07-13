'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FUNDING_LINES, FUNDING_LINE_KEYS } from '@/lib/portfolio-rules'

/** 모델 포트폴리오 목표 비중(%) + 자금줄(메타테마) 편집 — 종목 관리 행에 인라인. */
export function ModelWeightEditor({
  stockId,
  fundingLine,
  modelWeight,
}: {
  stockId: string
  fundingLine: string | null
  modelWeight: number | null
}) {
  const router = useRouter()
  const [weight, setWeight] = useState(modelWeight === null ? '' : String(modelWeight))
  const [line, setLine] = useState(fundingLine ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/stocks/${stockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelWeight: weight === '' ? null : Number(weight),
          fundingLine: line,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '저장 실패')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-secondary">
      <span className="font-medium text-primary">모델</span>
      <label className="flex items-center gap-1">
        비중
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="—"
          className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-xs tabular-nums text-primary outline-none focus:border-brand"
        />
        %
      </label>
      <label className="flex items-center gap-1">
        자금줄
        <select
          value={line}
          onChange={(e) => setLine(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-primary outline-none focus:border-brand"
        >
          <option value="">미지정</option>
          {FUNDING_LINE_KEYS.map((k) => (
            <option key={k} value={k}>
              {FUNDING_LINES[k].label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-brand/10 px-2.5 py-1 font-medium text-brand hover:bg-brand/20 disabled:opacity-60"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
      {error && <span className="text-loss">{error}</span>}
    </div>
  )
}
