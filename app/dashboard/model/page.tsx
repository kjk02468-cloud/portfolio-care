import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getModelPortfolio, type ModelPortfolioStock } from '@/lib/analysis'
import { STAGE_META, type StageValue } from '@/lib/stage-judge'
import { STAGE_POSITION_CAP, STAGE_SUM_RANGE } from '@/lib/portfolio-rules'
import { PortfolioCompliance } from '@/components/PortfolioCompliance'
import { ReportDisclaimer } from '@/components/ReportDisclaimer'

export const dynamic = 'force-dynamic'

const STAGE_ORDER: StageValue[] = [4, 3, 2, 1, 0]

function stageOf(s: ModelPortfolioStock): StageValue | null {
  return s.judge.judged ? s.judge.stage : null
}

export default async function ModelPortfolioPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { positions, totalWeight, violations, fundingLines, asOf } = await getModelPortfolio(
    session.user.id,
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">모델 포트폴리오</h1>
        <p className="mt-1 text-sm text-secondary">
          매뉴얼 v4.1 비중 규율(종목당·종목 수·체인·익스포저 상한)에 따른 목표 비중이에요.{' '}
          <Link href="/dashboard/principles" className="text-brand hover:underline">
            비중 규율 보기 →
          </Link>
        </p>
      </div>

      {positions.length === 0 ? (
        <div className="card p-8 text-center text-secondary">
          아직 모델 포트폴리오가 설정되지 않았어요.
        </div>
      ) : (
        <>
          <div className="card space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-primary">비중 규율 점검</h2>
              <span className="text-sm tabular-nums text-secondary">
                합계 {totalWeight}%
              </span>
            </div>
            <PortfolioCompliance violations={violations} />
          </div>

          {STAGE_ORDER.map((stage) => {
            const group = positions.filter((p) => stageOf(p) === stage)
            if (group.length === 0) return null
            const meta = STAGE_META[stage]
            const sum =
              Math.round(group.reduce((a, p) => a + p.weight, 0) * 10) / 10
            const range = STAGE_SUM_RANGE[stage]
            return (
              <section key={stage} className="space-y-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-lg font-semibold text-primary">{meta.label}</h2>
                  <span className="text-sm text-muted">{meta.role}</span>
                  <span className="text-xs tabular-nums text-muted">
                    · 합계 {sum}%
                    {range ? ` (권장 ${range[0]}~${range[1]}%)` : ''} · 종목당 상한{' '}
                    {STAGE_POSITION_CAP[stage]}%
                  </span>
                </div>
                <div className="card divide-y divide-border">
                  {group.map((p) => {
                    const cap = STAGE_POSITION_CAP[stage] || 1
                    const fill = Math.min(100, (p.weight / cap) * 100)
                    const over = p.weight > cap + 1e-9
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3">
                        <div className="w-16 shrink-0">
                          <div className="font-medium text-primary">{p.ticker}</div>
                          {p.held && (
                            <span className="text-[10px] font-medium text-brand">보유중</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate text-secondary">{p.name}</span>
                            <span className="shrink-0 tabular-nums font-medium text-primary">
                              {p.weight}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className={`h-full rounded-full ${over ? 'bg-loss' : 'bg-brand'}`}
                              style={{ width: `${fill}%` }}
                            />
                          </div>
                          {p.fundingLineLabel && (
                            <div className="mt-1 text-[11px] text-muted">
                              자금줄 · {p.fundingLineLabel}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {fundingLines.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-primary">자금줄(메타테마) 합산</h2>
              <div className="card divide-y divide-border">
                {fundingLines.map((f) => {
                  const over = f.cap !== null && f.sum > f.cap + 1e-9
                  return (
                    <div
                      key={f.line}
                      className="flex items-center justify-between gap-2 p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium text-primary">{f.label}</span>
                        <span className="ml-2 text-xs text-muted">
                          {f.tickers.join(' · ')}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 tabular-nums font-medium ${over ? 'text-loss' : 'text-secondary'}`}
                      >
                        {f.sum}%{f.cap !== null ? ` / ${f.cap}%` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted">
                연결·광학 체인(AAOI+CRDO+ALAB) 등 자금줄을 가로지르는 합산 상한은 위 점검 표에서
                확인하세요.
              </p>
            </section>
          )}

          <ReportDisclaimer updatedAt={asOf} />
          <p className="text-xs text-muted">
            모델 포트폴리오는 매뉴얼 규칙에 따른 예시 배분이며, 특정 이용자를 위한 매매 지시가
            아니에요. 실제 비중·매매는 본인 판단과 책임으로 결정하세요.
          </p>
        </>
      )}
    </div>
  )
}
