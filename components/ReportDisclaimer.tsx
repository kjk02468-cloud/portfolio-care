// 모든 분석글 하단에 고정되는 안내 문구 (보고서 작성 매뉴얼 §6).
// 개인 맞춤 매매 지시가 아니라는 점 + 데이터 기준 시각을 함께 노출한다.
export function ReportDisclaimer({
  updatedAt,
  publishedAt,
}: {
  updatedAt?: string | null
  publishedAt?: string | null
}) {
  const stamp = updatedAt ?? publishedAt ?? null
  const when = stamp ? formatStamp(stamp) : null

  return (
    <footer className="rounded-xl border border-border bg-surface-2/50 p-4 text-xs leading-relaxed text-muted">
      {when && (
        <p className="mb-2 font-medium text-secondary">마지막 업데이트: {when}</p>
      )}
      <p>
        이 보고서는 공개 정보와 사전 정의된 규칙에 따른 분석 결과이며, 특정 이용자에 대한
        매수·매도 또는 투자 자문이 아닙니다. 투자 판단과 손실에 대한 책임은 투자자에게 있으며,
        데이터 지연·오류 및 시장 변동 가능성이 있습니다.
      </p>
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
