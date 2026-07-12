'use client'

import type { LensTypeValue } from '@/lib/lens'
import {
  REQUIRED_JUDGE_FIELDS,
  type JudgeField,
  type StageUpdateEntry,
} from '@/lib/report-templates'

interface StockOption {
  id: string
  ticker: string
  name: string
}

const selectCls =
  'rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-primary outline-none transition focus:border-brand'

function FieldSelect({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string
  required: boolean
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className={`text-xs ${required ? 'font-semibold text-primary' : 'text-secondary'}`}>
        {label}
        {required && <span className="text-loss"> *</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectCls} ${required && !value ? 'border-loss/60' : ''}`}
      >
        <option value="">{required ? '선택 필요' : '반영 안함'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * 경로 A: 보고서 발행 시 태그 종목의 G값을 갱신하는 판정 반영 패널.
 * 렌즈별 필수 항목(실적→G3, 재무→G2, 밸류체인→G1, 뉴스→킬)은 응답해야 발행 가능.
 */
export function StageApplyPanel({
  lensType,
  taggedStocks,
  updates,
  onChange,
}: {
  lensType: LensTypeValue
  taggedStocks: StockOption[]
  updates: StageUpdateEntry[]
  onChange: (v: StageUpdateEntry[]) => void
}) {
  if (taggedStocks.length === 0) return null

  const required = new Set<JudgeField>(REQUIRED_JUDGE_FIELDS[lensType])

  const get = (stockId: string): StageUpdateEntry =>
    updates.find((u) => u.stockId === stockId) ?? {
      stockId,
      ticker: taggedStocks.find((s) => s.id === stockId)?.ticker ?? '',
    }

  const set = (stockId: string, patch: Partial<StageUpdateEntry>) => {
    const cur = get(stockId)
    const next = { ...cur, ...patch }
    onChange([...updates.filter((u) => u.stockId !== stockId), next])
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium text-secondary">
          판정 반영 (발행 시 자동 적용)
        </p>
        <p className="mt-0.5 text-xs text-muted">
          발행하면 매뉴얼 §A.2대로 G값이 갱신되고 단계가 자동 재판정돼요.{' '}
          <span className="text-loss">*</span> 표시는 이 렌즈의 필수 응답이에요.
        </p>
      </div>

      {taggedStocks.map((s) => {
        const u = get(s.id)
        return (
          <div
            key={s.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface-2/50 p-3"
          >
            <span className="w-14 shrink-0 font-medium text-primary">
              {s.ticker}
            </span>
            <FieldSelect
              label="G3 컨센"
              required={required.has('g3')}
              value={u.g3 ?? ''}
              options={[
                { value: 'up', label: '상향 (+1)' },
                { value: 'down', label: '정체·하향 (−1)' },
                { value: 'skip', label: '반영 안함(확인)' },
              ]}
              onChange={(v) => set(s.id, { g3: (v || undefined) as StageUpdateEntry['g3'] })}
            />
            <FieldSelect
              label="G1 수요"
              required={required.has('g1')}
              value={u.g1 ?? ''}
              options={[
                { value: 'pass', label: '통과' },
                { value: 'fail', label: '미통과' },
                { value: 'keep', label: '변경없음' },
              ]}
              onChange={(v) => set(s.id, { g1: (v || undefined) as StageUpdateEntry['g1'] })}
            />
            <FieldSelect
              label="G2 수익성"
              required={required.has('g2')}
              value={u.g2 ?? ''}
              options={[
                { value: 'pass', label: '통과' },
                { value: 'fail', label: '미통과' },
                { value: 'keep', label: '변경없음' },
              ]}
              onChange={(v) => set(s.id, { g2: (v || undefined) as StageUpdateEntry['g2'] })}
            />
            <FieldSelect
              label="G4 가격"
              required={false}
              value={u.g4 ?? ''}
              options={[
                { value: 'room', label: '여유 (조정됨)' },
                { value: 'hot', label: '과열 (고점권)' },
                { value: 'keep', label: '변경없음' },
              ]}
              onChange={(v) => set(s.id, { g4: (v || undefined) as StageUpdateEntry['g4'] })}
            />
            <FieldSelect
              label="킬라인"
              required={required.has('kill')}
              value={u.kill ?? ''}
              options={[
                { value: 'on', label: '발화 (즉시 이탈)' },
                { value: 'off', label: '아님' },
                { value: 'keep', label: '변경없음' },
              ]}
              onChange={(v) => set(s.id, { kill: (v || undefined) as StageUpdateEntry['kill'] })}
            />
          </div>
        )
      })}
    </div>
  )
}
