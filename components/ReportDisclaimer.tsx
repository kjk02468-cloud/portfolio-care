import type { LensTypeValue } from '@/lib/lens'

// 모든 분석글 하단에 고정되는 안내 문구 (보고서 작성 매뉴얼 §6).
// 공통 법적 문구는 유지하되, 렌즈별로 "무엇을 근거로 한 분석인지"를 한 줄 덧붙인다.
const LENS_NOTE: Record<LensTypeValue, string> = {
  earnings:
    '실적 발표와 컨센서스(추정치) 변화를 근거로 한 분석이에요. 추정치는 갱신·정정될 수 있어요.',
  financials:
    '공시된 재무제표를 근거로 한 분석이에요. 회계 정정·재작성 가능성이 있어요.',
  valuechain:
    '산업 구조와 수요 신호를 근거로 한 분석이에요. 업황은 예고 없이 바뀔 수 있어요.',
  news:
    '특정 사건·뉴스를 근거로 한 분석이라 시점에 민감해요. 이후 사실관계가 달라질 수 있어요.',
  macro:
    '시장 환경 전반에 대한 분석이며 특정 종목의 매매 신호가 아니에요. 개별 종목 단계 판정과는 독립이에요.',
}

// §6 고정 법적 문구 — 렌즈와 무관하게 항상 동일.
const FIXED_NOTICE =
  '이 보고서는 공개 정보와 사전 정의된 규칙에 따른 분석 결과이며, 특정 이용자에 대한 매수·매도 또는 투자 자문이 아닙니다. 투자 판단과 손실에 대한 책임은 투자자에게 있으며, 데이터 지연·오류 및 시장 변동 가능성이 있습니다.'

export function ReportDisclaimer({
  lensType,
  updatedAt,
  publishedAt,
}: {
  lensType?: LensTypeValue | string
  updatedAt?: string | null
  publishedAt?: string | null
}) {
  const stamp = updatedAt ?? publishedAt ?? null
  const when = stamp ? formatStamp(stamp) : null
  const note =
    lensType && lensType in LENS_NOTE
      ? LENS_NOTE[lensType as LensTypeValue]
      : null

  return (
    <footer className="rounded-xl border border-border bg-surface-2/50 p-4 text-xs leading-relaxed text-muted">
      {when && (
        <p className="mb-2 font-medium text-secondary">마지막 업데이트: {when}</p>
      )}
      {note && <p className="mb-1.5 text-secondary">{note}</p>}
      <p>{FIXED_NOTICE}</p>
    </footer>
  )
}

function formatStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
