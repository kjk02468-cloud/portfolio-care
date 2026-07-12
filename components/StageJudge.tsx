'use client'

import { useState } from 'react'
import {
  judgeStage,
  formatJudgeLine,
  STAGE_META,
  type JudgeInput,
} from '@/lib/stage-judge'

function Toggle({
  label,
  hint,
  value,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string
  hint?: string
  value: boolean
  onLabel: string
  offLabel: string
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="inline-flex shrink-0 rounded-lg border border-border p-0.5 text-sm">
        {[
          { v: true, l: onLabel },
          { v: false, l: offLabel },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition ${
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

/** 결정트리 체험용 판정기 — G값을 조작하면 단계가 즉시 판정된다. */
export function StageJudge() {
  const [ticker, setTicker] = useState('ALAB')
  const [kill, setKill] = useState(false)
  const [g1, setG1] = useState<0 | 1>(1)
  const [g2, setG2] = useState<0 | 1>(1)
  const [g3s, setG3s] = useState<JudgeInput['g3s']>(4)
  const [g4, setG4] = useState<0 | 1>(0)

  const input: JudgeInput = { kill, g1, g2, g3s, g4 }
  const result = judgeStage(input)
  const meta = STAGE_META[result.stage]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* 입력 */}
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-secondary">
            티커 (표시용)
          </span>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-brand"
          />
        </label>

        <Toggle
          label="킬라인 발화?"
          hint="종목별 킬 조건 충족 시 — 단계 무관 즉시 이탈 (①)"
          value={kill}
          onLabel="발화"
          offLabel="아님"
          onChange={setKill}
        />
        <Toggle
          label="G1 — 수요 조건 통과?"
          hint="업종별 치환표 (book-to-bill·ARR 등)"
          value={g1 === 1}
          onLabel="통과"
          offLabel="미통과"
          onChange={(v) => setG1(v ? 1 : 0)}
        />
        <Toggle
          label="G2 — 수익성 조건 통과?"
          hint="업종별 치환표 (OPM·GM·NRR 등)"
          value={g2 === 1}
          onLabel="통과"
          offLabel="미통과"
          onChange={(v) => setG2(v ? 1 : 0)}
        />

        {/* G3s */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">G3s — 모멘텀 레벨</p>
            <p className="text-xs text-muted">
              추정치 모멘텀 점수 0~4 (연속 분기 수 아님)
            </p>
          </div>
          <div className="inline-flex shrink-0 rounded-lg border border-border p-0.5 text-sm">
            {([0, 1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setG3s(n)}
                className={`rounded-md px-2.5 py-1.5 font-medium tabular-nums transition ${
                  g3s === n
                    ? 'bg-brand text-brand-fg'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          label="G4 — 가격이 충분히 조정됐나요?"
          hint="52주 고점 대비 20% 넘게 빠짐 = 여유 / 이내 = 과열"
          value={g4 === 1}
          onLabel="여유"
          offLabel="과열"
          onChange={(v) => setG4(v ? 1 : 0)}
        />
      </div>

      {/* 결과 */}
      <div className="space-y-3">
        <div className="rounded-xl bg-surface-2/60 p-5">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.badgeClass}`}
            >
              {meta.label}
              {result.subtype ? ` ${result.subtype}` : ''}
            </span>
            <span className="text-sm text-muted">
              매칭 규칙 {result.rule}
            </span>
          </div>
          <p className="mt-2 text-lg font-semibold text-primary">
            {result.action}
          </p>
          <p className="mt-1 text-sm text-secondary">{result.explanation}</p>
        </div>
        <div className="overflow-x-auto rounded-lg bg-surface-2/60 px-3 py-2">
          <code className="whitespace-nowrap text-xs text-secondary">
            {formatJudgeLine(ticker || 'TICKER', input)}
          </code>
        </div>
      </div>
    </div>
  )
}
