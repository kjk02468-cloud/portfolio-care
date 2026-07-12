'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LENS_TYPES,
  LENS_LABELS,
  lensLabel,
  type LensTypeValue,
} from '@/lib/lens'
import { LensFieldsEditor } from './LensFieldsEditor'
import { StageApplyPanel } from './StageApplyPanel'
import {
  REPORT_TEMPLATES,
  missingRequiredJudgements,
  JUDGE_FIELD_LABELS,
  type StageUpdateEntry,
} from '@/lib/report-templates'

interface StockOption {
  id: string
  ticker: string
  name: string
}

interface PostOption {
  id: string
  title: string
  lensType: string
}

export interface PostEditorInitial {
  id: string
  title: string
  body: string
  lensType: LensTypeValue
  themeTags: string
  stockIds: string[]
  lensFields: Record<string, unknown>
  relatedIds: string[]
  stageUpdates: StageUpdateEntry[]
  alreadyPublished: boolean
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30'

// 발행 전 체크리스트 (보고서 작성 매뉴얼 §8) — 강제는 아니고 스스로 점검용.
const PREPUBLISH_CHECKLIST = [
  '기준일과 데이터 기준 시각이 본문에 있다.',
  '한 줄 요약에 긍정 요인과 제한 요인이 모두 있다.',
  '각 숫자에 출처·기간·단위가 있다.',
  '컨센서스 변화의 원인·추정치 수·갱신일을 공개했다.',
  '가격 위치·밸류에이션·시장 위험을 분리했다.',
  '리스크가 측정 가능한 반증 조건으로 작성됐다.',
  '단계 변경 사유와 다음 점검일이 있다.',
  '개인화된 매매 지시나 수익 보장 표현이 없다.',
  "데이터 부족은 해당 G값을 비워 '판정 보류'로 남겼다.",
]

export function PostEditor({
  stocks,
  relatedCandidates = [],
  initial,
}: {
  stocks: StockOption[]
  relatedCandidates?: PostOption[]
  initial?: PostEditorInitial
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  // 새 글은 기본 렌즈 양식이 미리 들어간 상태로 시작 (필수 양식)
  const [body, setBody] = useState(
    initial?.body ?? REPORT_TEMPLATES[initial?.lensType ?? 'earnings'],
  )
  const [lensType, setLensType] = useState<LensTypeValue>(
    initial?.lensType ?? 'earnings',
  )
  const [themeTags, setThemeTags] = useState(initial?.themeTags ?? '')
  const [stockIds, setStockIds] = useState<string[]>(initial?.stockIds ?? [])
  const [lensFields, setLensFields] = useState<Record<string, unknown>>(
    initial?.lensFields ?? {},
  )
  const [relatedIds, setRelatedIds] = useState<string[]>(
    initial?.relatedIds ?? [],
  )
  const [stageUpdates, setStageUpdates] = useState<StageUpdateEntry[]>(
    initial?.stageUpdates ?? [],
  )
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const taggedStocks = stocks.filter((s) => stockIds.includes(s.id))
  const alreadyPublished = initial?.alreadyPublished ?? false

  // 새 글에서 렌즈 선택 시 본문이 비어 있으면 해당 렌즈 양식 자동 삽입.
  function changeLens(next: LensTypeValue) {
    setLensType(next)
    const cur = body.trim()
    if (cur === '' || cur === REPORT_TEMPLATES[lensType].trim()) {
      setBody(REPORT_TEMPLATES[next])
    }
  }

  function insertTemplate() {
    setBody((prev) =>
      prev.trim() === '' ? REPORT_TEMPLATES[lensType] : `${prev}\n\n${REPORT_TEMPLATES[lensType]}`,
    )
  }

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

  function toggleRelated(id: string) {
    setRelatedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const candidates = relatedCandidates.filter((p) => p.id !== initial?.id)

  async function save(status: 'draft' | 'published') {
    setError(null)

    // 발행 시 렌즈별 필수 판정 응답 검사 (최초 발행 대상 글만)
    if (status === 'published' && !alreadyPublished) {
      const missing = missingRequiredJudgements(lensType, stockIds, stageUpdates)
      if (missing.length > 0) {
        const tk = taggedStocks.find((s) => s.id === missing[0].stockId)?.ticker ?? ''
        setError(
          `발행하려면 ${tk}의 「${JUDGE_FIELD_LABELS[missing[0].field]}」 응답이 필요해요. (임시저장은 가능)`,
        )
        return
      }
    }

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
        relatedIds,
        stageUpdates,
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
            onChange={(e) => changeLens(e.target.value as LensTypeValue)}
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

      {/* 판정 반영 (경로 A) — 최초 발행 시 자동 적용 */}
      {alreadyPublished ? (
        taggedStocks.length > 0 && (
          <p className="rounded-xl border border-border p-4 text-xs text-muted">
            이미 발행된 글이에요. 판정 반영은 최초 발행 시 1회만 적용돼요 — G값
            수정이 필요하면 종목 관리에서 직접 보정하세요.
          </p>
        )
      ) : (
        <StageApplyPanel
          lensType={lensType}
          taggedStocks={taggedStocks}
          updates={stageUpdates}
          onChange={setStageUpdates}
        />
      )}

      {/* related_posts */}
      {candidates.length > 0 && (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-secondary">
            관련 분석글 (선택)
          </span>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
            {candidates.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 py-2 text-sm last:border-0 hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={relatedIds.includes(p.id)}
                  onChange={() => toggleRelated(p.id)}
                />
                <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-secondary">
                  {lensLabel(p.lensType)}
                </span>
                <span className="truncate text-primary">{p.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-secondary">
          본문 (마크다운)
          <button
            type="button"
            onClick={insertTemplate}
            className="text-xs font-medium text-brand hover:underline"
          >
            + {LENS_LABELS[lensType]} 양식 넣기
          </button>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder={'## 핵심\n분석 본문을 마크다운으로 작성하세요.'}
          className={`${inputCls} font-mono text-sm`}
        />
      </label>

      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-secondary">
          발행 전 체크리스트
        </summary>
        <ul className="mt-3 space-y-1.5 text-sm text-secondary">
          {PREPUBLISH_CHECKLIST.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-muted">☐</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </details>

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
