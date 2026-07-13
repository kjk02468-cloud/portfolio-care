'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { describeTrend, describeVolatility, describeVolume } from '@/lib/indicators/calc'
import { INDUSTRY_PROFILES, INDUSTRY_PROFILE_KEYS } from '@/lib/indicators/industry-profiles'
import { applyG3 } from '@/lib/stage-judge'

export interface AutoIndicatorData {
  price: number | null
  high52w: number | null
  drawdownPct: number | null
  ma50: number | null
  ma200: number | null
  atr14: number | null
  volAvgRatio: number | null
  g4Suggested: number | null
  revenueYoY: number | null
  revenueYoYPrev: number | null
  epsSurprisePct: number | null
  revenueSurprisePct: number | null
  g3Suggested: number | null
  grossMarginPct: number | null
  operatingMarginPct: number | null
  g1Suggested: number | null
  g2Suggested: number | null
  killRevenueDecline2q: boolean | null
  killMarginDecline2q: boolean | null
  killGuidanceCut2q: boolean | null
  evToSales: number | null
  pe: number | null
  evToSalesMedian5y: number | null
  peMedian5y: number | null
  valuationPreProfit: boolean | null
  evToSalesVsMedianPct: number | null
  peVsMedianPct: number | null
  asOf: string
  computedAt: string
  source: string
}

export interface StockCurrentStage {
  g1: number | null
  g2: number | null
  g3s: number | null
  g4: number | null
  kill: boolean
  stageNote: string | null
}

export interface RawQuarterlyReport {
  periodEnd: string
  reportedAt: string | null
  revenue: number | null
  grossProfit: number | null
  operatingIncome: number | null
  epsActual: number | null
  epsEstimate: number | null
  revenueEstimate: number | null
  source: string
}

const pct = (v: number | null, digits = 1) => (v === null ? '—' : `${v.toFixed(digits)}%`)
const money = (v: number | null) => (v === null ? '—' : v.toFixed(2))

function G01Badge({ v }: { v: number | null }) {
  if (v === null) return <span className="text-muted">판정 보류</span>
  return v === 1 ? (
    <span className="text-brand">통과</span>
  ) : (
    <span className="text-loss">미통과</span>
  )
}

export function AutoIndicatorPanel({
  stockId,
  industryProfile,
  indicator,
  current,
  quarterlyReports = [],
  stageUpdatedAt = null,
}: {
  stockId: string
  industryProfile: string | null
  indicator: AutoIndicatorData | null
  current: StockCurrentStage
  quarterlyReports?: RawQuarterlyReport[]
  stageUpdatedAt?: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patchStage(next: Partial<StockCurrentStage>) {
    setError(null)
    setLoading('apply')
    try {
      const res = await fetch(`/api/admin/stocks/${stockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: { ...current, ...next } }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '적용 실패')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setLoading(null)
    }
  }

  async function refresh() {
    setError(null)
    setLoading('refresh')
    try {
      const res = await fetch(`/api/admin/stocks/${stockId}/refresh-indicators`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '새로고침 실패')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setLoading(null)
    }
  }

  async function setProfile(v: string) {
    setError(null)
    setLoading('profile')
    try {
      const res = await fetch(`/api/admin/stocks/${stockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industryProfile: v }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '저장 실패')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요.')
    } finally {
      setLoading(null)
    }
  }

  const trend = indicator ? describeTrend(indicator.price ?? 0, indicator.ma50, indicator.ma200) : null
  const volatility = indicator ? describeVolatility(indicator.atr14, indicator.price ?? 0) : null
  const volume = indicator ? describeVolume(indicator.volAvgRatio) : null

  const killFlagList = indicator
    ? ([
        ['매출 2분기 역성장', indicator.killRevenueDecline2q],
        ['마진 2분기 연속 하락', indicator.killMarginDecline2q],
        ['가이던스 컷 2분기 연속', indicator.killGuidanceCut2q],
      ] as const)
    : []
  const activeKillFlags = killFlagList.filter(([, v]) => v === true)

  // 데이터 신뢰성 경고: 벤더가 연간(TTM) 수치를 분기마다 반복 제공하면 분기 매출이
  // 비정상적으로 평탄하게 나온다 — 최근 4개 분기 매출이 서로 ±1.5% 내로 붙어 있으면
  // 의심 신호(실제 분기 매출은 이보다 훨씬 크게 변동). 값이 없으면 판단하지 않는다.
  const revs = quarterlyReports
    .slice(0, 4)
    .map((r) => r.revenue)
    .filter((v): v is number => v !== null && v > 0)
  const ttmSuspect =
    revs.length >= 4 && (Math.max(...revs) - Math.min(...revs)) / Math.max(...revs) < 0.015
  const isMock = indicator?.source === 'mock'

  // §A.10 판정 주기: G3는 실적 발표 후 갱신해야 한다. 가장 최근 실적 발표일이 마지막
  // 단계 갱신일보다 뒤면 "새 실적 이후 아직 재판정 안 됨" — 관리자에게 표시만(자동 변경 아님).
  const latestReportedAt = quarterlyReports
    .map((r) => r.reportedAt)
    .filter((v): v is string => v !== null)
    .sort()
    .at(-1)
  const earningsPending =
    latestReportedAt !== undefined &&
    (stageUpdatedAt === null || latestReportedAt > stageUpdatedAt)

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary">자동 지표 (제안값)</span>
        <button
          type="button"
          onClick={refresh}
          disabled={loading !== null}
          className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
        >
          {loading === 'refresh' ? '갱신 중…' : '새로고침'}
        </button>
      </div>

      {/* 업종 프로필 선택 — G1/G2 제안의 전제 */}
      <label className="flex items-center gap-2 text-xs text-secondary">
        업종 프로필
        <select
          value={industryProfile ?? ''}
          onChange={(e) => setProfile(e.target.value)}
          disabled={loading !== null}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-primary outline-none focus:border-brand"
        >
          <option value="">미지정 (자동 제안 없음)</option>
          {INDUSTRY_PROFILE_KEYS.map((k) => (
            <option key={k} value={k}>
              {INDUSTRY_PROFILES[k].label}
            </option>
          ))}
        </select>
      </label>

      {/* 데이터 신뢰성 경고 — 제안값보다 위에 크게 */}
      {isMock && (
        <div className="rounded-lg border border-loss/40 bg-loss/10 px-2.5 py-2 text-xs text-loss">
          ⚠ <b>실데이터 아님 (mock).</b> FMP 호출이 실패해 가상 데이터로 계산됐어요. 이
          제안값·차트를 신뢰하지 마세요 — 새로고침을 다시 누르거나, FMP 키·쿼터를 확인하세요.
        </div>
      )}
      {earningsPending && (
        <div className="rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-2 text-xs text-brand">
          🔔 <b>새 실적 발표됨 ({latestReportedAt?.slice(0, 10)}).</b> 마지막 판정
          {stageUpdatedAt ? ` (${stageUpdatedAt.slice(0, 10)})` : ''} 이후 실적이 나왔어요 —
          §A.10대로 G3를 재판정하세요. 아래 G3 신호를 확인하고 적용하면 이 알림이 사라져요.
        </div>
      )}
      {ttmSuspect && !isMock && (
        <div className="rounded-lg border border-loss/40 bg-loss/10 px-2.5 py-2 text-xs text-loss">
          ⚠ <b>분기 매출이 비정상적으로 평탄해요.</b> 벤더가 연간(TTM) 수치를 분기마다 반복
          제공 중일 수 있어요 — 매출YoY·마진·G2 제안값을 신뢰하지 말고 아래 &quot;분기 재무
          원본&quot;에서 직접 확인하세요.
        </div>
      )}

      {!indicator ? (
        <p className="text-xs text-muted">아직 지표가 없어요. 새로고침을 눌러 계산하세요.</p>
      ) : (
        <>
          {/* G1/G2/G3/G4 제안 vs 적용 */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-surface px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary">
                  G1 제안 (매출YoY {pct(indicator.revenueYoY)})
                </span>
                <G01Badge v={indicator.g1Suggested} />
              </div>
              {indicator.g1Suggested !== null && indicator.g1Suggested !== current.g1 && (
                <button
                  type="button"
                  onClick={() => patchStage({ g1: indicator.g1Suggested })}
                  disabled={loading !== null}
                  className="mt-1 text-brand hover:underline disabled:opacity-60"
                >
                  적용
                </button>
              )}
            </div>

            <div className="rounded-lg bg-surface px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary">
                  G2 제안 (GM {pct(indicator.grossMarginPct)} · OPM {pct(indicator.operatingMarginPct)})
                </span>
                <G01Badge v={indicator.g2Suggested} />
              </div>
              {indicator.g2Suggested !== null && indicator.g2Suggested !== current.g2 && (
                <button
                  type="button"
                  onClick={() => patchStage({ g2: indicator.g2Suggested })}
                  disabled={loading !== null}
                  className="mt-1 text-brand hover:underline disabled:opacity-60"
                >
                  적용
                </button>
              )}
            </div>

            <div className="rounded-lg bg-surface px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary">
                  G3 이번 분기 신호 (매출서프 {pct(indicator.revenueSurprisePct)} · EPS서프{' '}
                  {pct(indicator.epsSurprisePct)})
                </span>
                {indicator.g3Suggested === null ? (
                  <span className="text-muted">판정 보류</span>
                ) : indicator.g3Suggested === 1 ? (
                  <span className="text-brand">상향(+1)</span>
                ) : (
                  <span className="text-loss">하향(−1)</span>
                )}
              </div>
              {indicator.g3Suggested !== null && (
                <button
                  type="button"
                  onClick={() =>
                    patchStage({ g3s: applyG3(current.g3s, indicator.g3Suggested === 1 ? 1 : 0) })
                  }
                  disabled={loading !== null}
                  className="mt-1 text-brand hover:underline disabled:opacity-60"
                >
                  G3s에 적용
                </button>
              )}
            </div>

            <div className="rounded-lg bg-surface px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary">
                  G4 제안 (52주 고점 대비 {pct(indicator.drawdownPct ? indicator.drawdownPct * 100 : null)})
                </span>
                {indicator.g4Suggested === null ? (
                  <span className="text-muted">판정 보류</span>
                ) : indicator.g4Suggested === 1 ? (
                  <span className="text-brand">여유</span>
                ) : (
                  <span className="text-loss">과열</span>
                )}
              </div>
              {indicator.g4Suggested !== null && indicator.g4Suggested !== current.g4 && (
                <button
                  type="button"
                  onClick={() => patchStage({ g4: indicator.g4Suggested })}
                  disabled={loading !== null}
                  className="mt-1 text-brand hover:underline disabled:opacity-60"
                >
                  적용
                </button>
              )}
            </div>
          </div>

          {/* 차트·수급 — 표시 전용, 판정 입력 아님(보고서 가이드 §4-1) */}
          <div className="rounded-lg bg-surface px-2.5 py-2 text-xs text-secondary">
            <span className="font-medium text-primary">차트·수급</span>{' '}
            <span className="text-muted">(판정과 독립 · 진입 타이밍 참고)</span>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>현재가 {money(indicator.price)}</span>
              <span>52주 고점 {money(indicator.high52w)}</span>
              <span>{trend}</span>
              <span>{volatility}</span>
              <span>{volume}</span>
            </div>
          </div>

          {/* 밸류에이션 — 가격 위험 레이어, 단계 판정과 분리 */}
          {(indicator.evToSales !== null || indicator.pe !== null) && (
            <div className="rounded-lg bg-surface px-2.5 py-2 text-xs text-secondary">
              <span className="font-medium text-primary">밸류에이션</span>{' '}
              <span className="text-muted">(가격 위험 · 판정과 독립)</span>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {indicator.evToSales !== null && (
                  <span>
                    EV/Sales {indicator.evToSales.toFixed(1)}배 (중앙값{' '}
                    {indicator.evToSalesMedian5y?.toFixed(1) ?? '—'}
                    {indicator.evToSalesVsMedianPct !== null
                      ? `, ${indicator.evToSalesVsMedianPct >= 0 ? '+' : ''}${indicator.evToSalesVsMedianPct.toFixed(0)}%`
                      : ''}
                    )
                  </span>
                )}
                {indicator.valuationPreProfit ? (
                  <span className="text-muted">P/E: 흑자 전(무의미)</span>
                ) : indicator.pe !== null ? (
                  <span>
                    P/E {indicator.pe.toFixed(1)}배 (중앙값 {indicator.peMedian5y?.toFixed(1) ?? '—'}
                    {indicator.peVsMedianPct !== null
                      ? `, ${indicator.peVsMedianPct >= 0 ? '+' : ''}${indicator.peVsMedianPct.toFixed(0)}%`
                      : ''}
                    )
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* 킬라인 수치형 참고 신호 — 판정 아님, 확인용 */}
          {activeKillFlags.length > 0 && (
            <div className="rounded-lg border border-loss/30 bg-loss/5 px-2.5 py-2 text-xs">
              <span className="font-medium text-loss">킬라인 확인 신호</span>
              <ul className="mt-1 space-y-0.5 text-secondary">
                {activeKillFlags.map(([label]) => (
                  <li key={label}>· {label}</li>
                ))}
              </ul>
              <p className="mt-1 text-muted">
                수치 신호일 뿐 판정 아님 — 매뉴얼상 킬은 질적 확인(고객 이탈·경쟁 등)이 더 필요해요.
              </p>
            </div>
          )}

          {/* 원본 분기 재무 — 자동 계산값이 이상해 보일 때 여기서 직접 확인 */}
          {quarterlyReports.length > 0 && (
            <details className="rounded-lg bg-surface px-2.5 py-2 text-xs">
              <summary className="cursor-pointer font-medium text-secondary">
                최근 분기 재무 원본 ({quarterlyReports.length}개 · 값이 이상하면 여기서 확인)
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-1 pr-2 font-medium">분기말</th>
                      <th className="py-1 pr-2 font-medium">매출</th>
                      <th className="py-1 pr-2 font-medium">GM</th>
                      <th className="py-1 pr-2 font-medium">OPM</th>
                      <th className="py-1 pr-2 font-medium">EPS 실제</th>
                      <th className="py-1 pr-2 font-medium">EPS 컨센</th>
                      <th className="py-1 font-medium">출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyReports.map((r) => {
                      const gm =
                        r.grossProfit !== null && r.revenue ? (r.grossProfit / r.revenue) * 100 : null
                      const opm =
                        r.operatingIncome !== null && r.revenue
                          ? (r.operatingIncome / r.revenue) * 100
                          : null
                      return (
                        <tr key={r.periodEnd} className="border-b border-border/60 last:border-0">
                          <td className="py-1 pr-2 tabular-nums text-primary">
                            {r.periodEnd.slice(0, 10)}
                          </td>
                          <td className="py-1 pr-2 tabular-nums text-secondary">
                            {r.revenue !== null ? Math.round(r.revenue).toLocaleString() : '—'}
                          </td>
                          <td className="py-1 pr-2 tabular-nums text-secondary">{pct(gm)}</td>
                          <td className="py-1 pr-2 tabular-nums text-secondary">{pct(opm)}</td>
                          <td className="py-1 pr-2 tabular-nums text-secondary">
                            {money(r.epsActual)}
                          </td>
                          <td className="py-1 pr-2 tabular-nums text-secondary">
                            {money(r.epsEstimate)}
                          </td>
                          <td className="py-1 text-muted">{r.source}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-muted">
                분기마다 매출·이익이 거의 똑같이 반복되면 벤더가 연간(TTM) 수치를 분기별로 잘못
                내려주고 있다는 신호예요 — 그럴 땐 GM·OPM 제안값을 신뢰하지 마세요.
              </p>
            </details>
          )}

          <p className="text-[10px] text-muted">
            기준일 {indicator.asOf.slice(0, 10)} · {indicator.source}
          </p>
        </>
      )}

      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  )
}
