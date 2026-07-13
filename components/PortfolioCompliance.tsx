import type { Violation } from '@/lib/portfolio-rules'

const KIND_LABEL: Record<Violation['kind'], string> = {
  position_cap: '종목당 상한',
  count_cap: '종목 수 상한',
  theme_cap: '테마·체인 상한',
  gross_exposure: '그로스 익스포저',
  stage_sum: '단계 합계(권장)',
}

/**
 * 비중 규율 위반 목록. 강제(빨강) → 권장(노랑) 순으로 이미 정렬된 배열을 받는다.
 * 위반이 없으면 통과 배지. 관리자·구독자 뷰 공용.
 */
export function PortfolioCompliance({ violations }: { violations: Violation[] }) {
  const enforce = violations.filter((v) => v.severity === 'enforce')
  const advisory = violations.filter((v) => v.severity === 'advisory')

  if (violations.length === 0) {
    return (
      <div className="rounded-xl border border-gain/30 bg-gain/10 px-4 py-3 text-sm text-gain">
        ✓ 비중 규율 전 항목 통과 — 종목당·종목 수·체인·익스포저 상한 이내예요.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {enforce.length > 0 && (
          <span className="rounded-full bg-loss/15 px-2.5 py-0.5 font-medium text-loss">
            강제 위반 {enforce.length}건
          </span>
        )}
        {advisory.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
            권장 점검 {advisory.length}건
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {violations.map((v, i) => (
          <li
            key={i}
            className={`rounded-lg border px-3 py-2 text-sm ${
              v.severity === 'enforce'
                ? 'border-loss/30 bg-loss/5 text-secondary'
                : 'border-amber-500/30 bg-amber-500/5 text-secondary'
            }`}
          >
            <span
              className={`mr-2 text-xs font-medium ${
                v.severity === 'enforce' ? 'text-loss' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              [{KIND_LABEL[v.kind]}]
            </span>
            {v.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
