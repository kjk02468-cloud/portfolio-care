import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getStageGroups } from '@/lib/analysis'
import { STAGE_META, type StageValue } from '@/lib/stage-judge'
import { PostCard } from '@/components/PostCard'

export const dynamic = 'force-dynamic'

function groupTitle(stage: StageValue | 'unjudged') {
  if (stage === 'unjudged') return { label: '미판정', role: 'G값 입력 대기' }
  return STAGE_META[stage]
}

export default async function StagesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const groups = await getStageGroups(session.user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">단계별 종목</h1>
        <p className="mt-1 text-sm text-secondary">
          투자 매뉴얼 결정트리로 자동 판정된 단계예요.{' '}
          <Link href="/dashboard/principles" className="text-brand hover:underline">
            판정 기준 보기 →
          </Link>
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="card p-8 text-center text-secondary">
          아직 판정된 종목이 없어요.
        </div>
      ) : (
        groups.map((group) => {
          const meta = groupTitle(group.stage)
          return (
            <section key={String(group.stage)} className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-primary">
                  {meta.label}
                </h2>
                <span className="text-sm text-muted">{meta.role}</span>
                <span className="text-xs text-muted">
                  · {group.stocks.length}종목
                </span>
              </div>

              <div className="space-y-4">
                {group.stocks.map((s) => (
                  <div key={s.id} className="card animate-rise p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {s.ticker}
                      </span>
                      <span className="text-sm text-muted">{s.name}</span>
                      {s.judge.judged && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_META[s.judge.stage].badgeClass}`}
                        >
                          {STAGE_META[s.judge.stage].label}
                          {s.judge.subtype ? ` ${s.judge.subtype}` : ''} ·{' '}
                          {s.judge.rule}
                        </span>
                      )}
                      {s.held && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          보유중
                        </span>
                      )}
                    </div>

                    {s.judge.judged && (
                      <p className="mt-1.5 text-sm text-secondary">
                        {s.judge.explanation}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted">
                      <span>G1 {s.g1 ?? '-'}</span>
                      <span>G2 {s.g2 ?? '-'}</span>
                      <span>G3s {s.g3s ?? '-'}</span>
                      <span>G4 {s.g4 ?? '-'}</span>
                      {s.kill && <span className="text-loss">킬 ON</span>}
                    </div>
                    {s.stageNote && (
                      <p className="mt-1.5 text-xs text-muted">{s.stageNote}</p>
                    )}

                    {s.posts.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-border pt-4">
                        {s.posts.map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
