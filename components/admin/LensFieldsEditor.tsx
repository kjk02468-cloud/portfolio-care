'use client'

import type { LensTypeValue } from '@/lib/lens'

type Fields = Record<string, unknown>

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

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

/** A dynamic list of plain strings (chain steps, indicators). */
function StringList({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string
  items: string[]
  placeholder: string
  onChange: (v: string[]) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-secondary">{label}</span>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={it}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg border border-border px-2.5 text-sm text-muted hover:text-loss"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="text-sm font-medium text-brand hover:underline"
        >
          + 추가
        </button>
      </div>
    </div>
  )
}

/** A dynamic list of {key,value} or {ticker,items} pairs. */
function PairList({
  label,
  items,
  keyName,
  valName,
  keyPlaceholder,
  valPlaceholder,
  onChange,
}: {
  label: string
  items: { [k: string]: string }[]
  keyName: string
  valName: string
  keyPlaceholder: string
  valPlaceholder: string
  onChange: (v: { [k: string]: string }[]) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-secondary">{label}</span>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={it[keyName] ?? ''}
              placeholder={keyPlaceholder}
              onChange={(e) => {
                const next = [...items]
                next[i] = { ...next[i], [keyName]: e.target.value }
                onChange(next)
              }}
              className={`${inputCls} w-1/3`}
            />
            <input
              value={it[valName] ?? ''}
              placeholder={valPlaceholder}
              onChange={(e) => {
                const next = [...items]
                next[i] = { ...next[i], [valName]: e.target.value }
                onChange(next)
              }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg border border-border px-2.5 text-sm text-muted hover:text-loss"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, { [keyName]: '', [valName]: '' }])}
          className="text-sm font-medium text-brand hover:underline"
        >
          + 추가
        </button>
      </div>
    </div>
  )
}

export function LensFieldsEditor({
  lensType,
  value,
  onChange,
}: {
  lensType: LensTypeValue
  value: Fields
  onChange: (v: Fields) => void
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  const str = (k: string) => (typeof value[k] === 'string' ? (value[k] as string) : '')
  const strList = (k: string): string[] =>
    Array.isArray(value[k]) ? (value[k] as unknown[]).map(String) : []
  const pairList = (k: string): Record<string, string>[] =>
    Array.isArray(value[k]) ? (value[k] as Record<string, string>[]) : []

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-secondary">렌즈 필드</p>

      {lensType === 'earnings' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="분기 (예: 2026 Q2)">
            <input value={str('quarter')} onChange={(e) => set('quarter', e.target.value)} className={inputCls} />
          </Field>
          <Field label="서프라이즈">
            <select value={str('surprise')} onChange={(e) => set('surprise', e.target.value)} className={inputCls}>
              <option value="">선택</option>
              <option value="beat">상회</option>
              <option value="inline">부합</option>
              <option value="miss">하회</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <PairList
              label="핵심 지표 (매출/영업이익/가이던스 등)"
              items={pairList('keyMetrics')}
              keyName="key"
              valName="value"
              keyPlaceholder="항목 (매출)"
              valPlaceholder="값 (전년比 +12%)"
              onChange={(v) => set('keyMetrics', v)}
            />
          </div>
        </div>
      )}

      {lensType === 'valuechain' && (
        <div className="space-y-4">
          <Field label="산업">
            <input value={str('industry')} onChange={(e) => set('industry', e.target.value)} placeholder="AI 반도체" className={inputCls} />
          </Field>
          <StringList label="밸류체인 단계 (순서대로)" items={strList('chainSteps')} placeholder="예: 소재 → 장비 → 파운드리" onChange={(v) => set('chainSteps', v)} />
          <Field label="병목 단계">
            <input value={str('bottleneckStep')} onChange={(e) => set('bottleneckStep', e.target.value)} placeholder="HBM 패키징" className={inputCls} />
          </Field>
          <Field label="자본 집중도 (서술)">
            <textarea value={str('capitalConcentration')} onChange={(e) => set('capitalConcentration', e.target.value)} rows={3} className={inputCls} />
          </Field>
        </div>
      )}

      {lensType === 'macro' && (
        <div className="space-y-4">
          <StringList label="지표 (금리/환율/유가 등)" items={strList('indicators')} placeholder="미 10년물 금리" onChange={(v) => set('indicators', v)} />
          <Field label="방향">
            <input value={str('direction')} onChange={(e) => set('direction', e.target.value)} placeholder="상승 / 하락 / 횡보" className={inputCls} />
          </Field>
          <Field label="시장 영향">
            <textarea value={str('marketImpact')} onChange={(e) => set('marketImpact', e.target.value)} rows={2} className={inputCls} />
          </Field>
          <Field label="포트폴리오 영향">
            <textarea value={str('portfolioImpact')} onChange={(e) => set('portfolioImpact', e.target.value)} rows={2} className={inputCls} />
          </Field>
        </div>
      )}

      {lensType === 'news' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="원문 링크">
            <input value={str('sourceUrl')} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://…" className={inputCls} />
          </Field>
          <Field label="영향 방향">
            <select value={str('impactDirection')} onChange={(e) => set('impactDirection', e.target.value)} className={inputCls}>
              <option value="">선택</option>
              <option value="positive">호재</option>
              <option value="negative">악재</option>
              <option value="neutral">중립</option>
            </select>
          </Field>
          <Field label="강도">
            <select value={str('strength')} onChange={(e) => set('strength', e.target.value)} className={inputCls}>
              <option value="">선택</option>
              <option value="strong">강</option>
              <option value="medium">중</option>
              <option value="weak">약</option>
            </select>
          </Field>
        </div>
      )}

      {lensType === 'financials' && (
        <PairList
          label="종목별 핵심 재무 항목"
          items={pairList('perTickerKeyItems')}
          keyName="ticker"
          valName="items"
          keyPlaceholder="티커"
          valPlaceholder="예: FCF, 자사주매입"
          onChange={(v) => set('perTickerKeyItems', v)}
        />
      )}
    </div>
  )
}
