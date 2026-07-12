import fs from 'node:fs'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StageJudge } from '@/components/StageJudge'
import { PostBody } from '@/components/PostBody'

export const dynamic = 'force-dynamic'

const stageRows = [
  { stage: '1단계', role: '관망', cap: '0%', desc: '수요(G1)·수익성(G2) 미통과. 지켜만 봐요.' },
  { stage: '2단계', role: '적립', cap: '15%', desc: '투자 이유 확인, 모멘텀 미성숙. 급여·신규 1순위.' },
  { stage: '3단계', role: '유지', cap: '15%', desc: '모멘텀 레벨 2 + 가격 여유. 보유하되 추매 금지.' },
  { stage: '4단계', role: '수확', cap: '10%', desc: '모멘텀 성숙. 4-A는 ride, 4-B는 과열 트림.' },
]

const inputCards = [
  { k: 'G1', t: '수요', d: '업종별 수요 조건 통과 여부 (book-to-bill·ARR 등)' },
  { k: 'G2', t: '수익성', d: '업종별 수익성 조건 통과 여부 (OPM·GM·NRR 등)' },
  { k: 'G3s', t: '모멘텀', d: '추정치 모멘텀 레벨 0~4. 컨센 상향이면 +1, 아니면 −1' },
  { k: 'G4', t: '가격', d: '고점 대비 20% 넘게 조정됐으면 여유(1), 아니면 과열(0)' },
  { k: '킬', t: '킬라인', d: '종목별 치명 조건. 발화하면 단계 무관 즉시 이탈' },
]

const treeFlow = [
  { rule: '①', q: '킬라인이 발화했나요?', a: '→ 즉시 이탈 (단계 무관)' },
  { rule: '②', q: 'G1 또는 G2가 미통과인가요?', a: '→ 1단계 (관망)' },
  { rule: '③', q: 'G3s가 3 이상인가요?', a: '→ 4단계 4-A (ride — 가격 무관)' },
  { rule: '④', q: 'G3s가 2 이상이고 과열(G4=0)인가요?', a: '→ 4단계 4-B (트림)' },
  { rule: '⑤', q: 'G3s가 정확히 2이고 여유(G4=1)인가요?', a: '→ 3단계 (유지)' },
  { rule: '⑥', q: 'G3s가 1 이하이고 여유인가요?', a: '→ 2단계 (적립)' },
  { rule: '⑦', q: 'G3s가 1 이하이고 과열인가요?', a: '→ 2단계 (추가매수 금지)' },
]

export default async function PrinciplesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const manual = fs.readFileSync(
    path.join(process.cwd(), 'content', 'investment-manual.md'),
    'utf8',
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-primary">투자 원칙</h1>
        <p className="mt-1 text-sm text-secondary">
          종목을 1~4단계로 나누는 기준이에요. 판정은 아래 5개 값으로만 해요.
        </p>
      </div>

      {/* 쉬운 요약 — 4단계 */}
      <section className="card animate-rise overflow-x-auto p-5">
        <h2 className="mb-4 font-semibold text-primary">4단계, 한눈에</h2>
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-secondary">
              <th className="py-2 pr-3 font-medium">단계</th>
              <th className="py-2 pr-3 font-medium">역할</th>
              <th className="py-2 pr-3 font-medium">종목당 상한</th>
              <th className="py-2 font-medium">의미</th>
            </tr>
          </thead>
          <tbody>
            {stageRows.map((r) => (
              <tr key={r.stage} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3 font-semibold text-primary">{r.stage}</td>
                <td className="py-2.5 pr-3 text-brand">{r.role}</td>
                <td className="py-2.5 pr-3 tabular-nums text-secondary">{r.cap}</td>
                <td className="py-2.5 text-secondary">{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 쉬운 요약 — 5개 입력값 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-primary">판정에 쓰는 값은 딱 5개</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {inputCards.map((c, i) => (
            <div
              key={c.k}
              className="card animate-rise p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <p className="text-lg font-bold text-brand">{c.k}</p>
              <p className="text-sm font-medium text-primary">{c.t}</p>
              <p className="mt-1 text-xs text-secondary">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 쉬운 요약 — 결정트리 플로우 */}
      <section className="card animate-rise p-5">
        <h2 className="mb-1 font-semibold text-primary">결정트리 — 위에서부터 첫 매칭만</h2>
        <p className="mb-4 text-xs text-muted">
          질문을 순서대로 따라가다 처음 &quot;예&quot;가 나오는 곳이 그 종목의 단계예요.
        </p>
        <ol className="space-y-2">
          {treeFlow.map((f) => (
            <li key={f.rule} className="flex items-start gap-2.5 text-sm">
              <span className="shrink-0 font-semibold text-brand">{f.rule}</span>
              <span className="text-primary">{f.q}</span>
              <span className="ml-auto shrink-0 whitespace-nowrap text-secondary">{f.a}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 판정기 */}
      <section className="card animate-rise p-5">
        <h2 className="mb-1 font-semibold text-primary">판정기 — 직접 해보기</h2>
        <p className="mb-4 text-xs text-muted">
          값을 바꾸면 결정트리가 즉시 다시 판정해요. 단계별 종목 페이지의 판정과 같은 로직이에요.
        </p>
        <StageJudge />
      </section>

      {/* 전문 원문 */}
      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-primary">
          매뉴얼 전문 보기 (v4.1 원문)
        </summary>
        <div className="mt-4 border-t border-border pt-4">
          <PostBody>{manual}</PostBody>
        </div>
      </details>
    </div>
  )
}
