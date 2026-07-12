'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { judgeStock, STAGE_META, type StockStageFields } from '@/lib/stage-judge'

export interface StockStageData extends StockStageFields {
  id: string
  ticker: string
  stageNote: string | null
}

function Toggle01({
  label,
  value,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string
  value: number | null
  onLabel: string
  offLabel: string
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-16 shrink-0 text-xs text-secondary">{label}</span>
      <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
        {[
          { v: 1, l: onLabel },
          { v: 0, l: offLabel },
          { v: null, l: '미판정' },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-md px-2 py-1 font-medium transition ${
              value === o.v
                ? 'bg-surface-2 text-primary'
                : 'text-muted hover:text-primary'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 경로 B: 종목 관리에서 G값 직접 보정 (분기 기준일 §A.10 조정용). */
export function StockStagePanel({ stock }: { stock: StockStageData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [g1, setG1] = useState<number | null>(stock.g1)
  const [g2, setG2] = useState<number | null>(stock.g2)
  const [g3s, setG3s] = useState<number | null>(stock.g3s)
  const [g4, setG4] = useState<number | null>(stock.g4)
  const [kill, setKill] = useState<boolean>(stock.kill)
  const [note, setNote] = useState(stock.stageNote ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const judged = judgeStock({ g1, g2, g3s, g4, kill })
  const meta = judged.judged ? STAGE_META[judged.stage] : null

  async function saveStage() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stocks/${stock.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: { g1, g2, g3s, g4, kill, stageNote: note },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '저장에 실패했어요.')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
          meta ? meta.badgeClass : 'bg-surface-2 text-muted'
        }`}
      >
        {meta
          ? `${meta.label}${judged.judged && judged.subtype ? ` ${judged.subtype}` : ''}`
          : '미판정'}{' '}
        {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="mt-2 space-y-2.5 rounded-xl border border-border p-3">
          <Toggle01 label="G1 수요" value={g1} onLabel="통과" offLabel="미통과" onChange={setG1} />
          <Toggle01 label="G2 수익성" value={g2} onLabel="통과" offLabel="미통과" onChange={setG2} />

          {/* G3s 스테퍼 */}
          <div className="flex items-center gap-1.5">
            <span className="w-16 shrink-0 text-xs text-secondary">G3s 모멘텀</span>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setG3s(Math.max(0, (g3s ?? 0) - 1))}
                className="rounded-lg border border-border px-2 py-1 text-xs text-secondary hover:text-primary"
              >
                −1
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums text-primary">
                {g3s ?? '-'}
              </span>
              <button
                type="button"
                onClick={() => setG3s(Math.min(4, (g3s ?? 0) + 1))}
                className="rounded-lg border border-border px-2 py-1 text-xs text-secondary hover:text-primary"
              >
                +1
              </button>
              <span className="ml-1 text-[10px] text-muted">(0~4 · 연속 분기 수 아님)</span>
            </div>
          </div>

          <Toggle01 label="G4 가격" value={g4} onLabel="여유" offLabel="과열" onChange={setG4} />

          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={kill}
              onChange={(e) => setKill(e.target.checked)}
            />
            킬라인 발화 (① 즉시 이탈)
          </label>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="판정 근거 메모 (예: 분기 기준일 보정)"
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-primary outline-none focus:border-brand"
          />

          {/* 판정 미리보기 */}
          <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-xs">
            {judged.judged ? (
              <>
                <span className={`rounded-full px-2 py-0.5 font-medium ${STAGE_META[judged.stage].badgeClass}`}>
                  {STAGE_META[judged.stage].label}
                  {judged.subtype ? ` ${judged.subtype}` : ''}
                </span>{' '}
                <span className="text-muted">
                  {judged.rule} · {judged.action}
                </span>
              </>
            ) : (
              <span className="text-muted">G값이 모두 입력되면 자동 판정돼요.</span>
            )}
          </div>

          {error && <p className="text-xs text-loss">{error}</p>}

          <button
            type="button"
            onClick={saveStage}
            disabled={loading}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg transition hover:bg-brand-strong disabled:opacity-60"
          >
            {loading ? '저장 중…' : '판정 저장'}
          </button>
        </div>
      )}
    </div>
  )
}
