import fs from 'node:fs'
import path from 'node:path'
import { PostBody } from '@/components/PostBody'

// 보고서 작성 매뉴얼(§4~9)을 관리자 편집 화면에서 접어서 볼 수 있게 렌더.
// 서버 컴포넌트 — 디스크에서 content/report-guide.md 를 읽어요.
export function ReportGuide() {
  const guide = fs.readFileSync(
    path.join(process.cwd(), 'content', 'report-guide.md'),
    'utf8',
  )

  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-semibold text-primary">
        보고서 작성 매뉴얼 (양식·반증 조건·체크리스트)
      </summary>
      <p className="mt-2 text-xs text-muted">
        가격 3축 분리, 측정 가능한 반증 조건, 발행 전 체크리스트, 바로 쓰는 템플릿.
        렌즈를 고르면 본문 양식은 자동으로 들어가요.
      </p>
      <div className="mt-4 border-t border-border pt-4">
        <PostBody>{guide}</PostBody>
      </div>
    </details>
  )
}
