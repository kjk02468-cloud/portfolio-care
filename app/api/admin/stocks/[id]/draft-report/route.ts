import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guards'
import { generateReportDraft } from '@/lib/report-draft'
import { LENS_TYPES, type LensTypeValue } from '@/lib/lens'

type Params = { params: Promise<{ id: string }> }

/** 종목의 지표·재무·판정 결과로 보고서 초안(마크다운)을 생성. 숫자는 채우고,
 * 분석가 판단이 필요한 서술은 [대괄호] 자리로 남긴다. */
export async function POST(req: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = (await req.json().catch(() => null)) as
    | { lensType?: unknown; withNarrative?: unknown }
    | null
  const lensType = body?.lensType
  const withNarrative = body?.withNarrative === true
  if (typeof lensType !== 'string' || !LENS_TYPES.includes(lensType as LensTypeValue)) {
    return NextResponse.json({ error: 'Invalid lensType' }, { status: 400 })
  }
  if (lensType === 'macro') {
    return NextResponse.json(
      { error: '거시 렌즈는 종목별 자동 초안 대상이 아니에요.' },
      { status: 400 },
    )
  }

  try {
    const markdown = await generateReportDraft(id, lensType as LensTypeValue, withNarrative)
    return NextResponse.json({ markdown })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '초안 생성에 실패했어요.' },
      { status: 400 },
    )
  }
}
