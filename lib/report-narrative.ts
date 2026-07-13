import Anthropic from '@anthropic-ai/sdk'

// 리포트 서술 자동 초안 (하우스 보이스). 원칙:
// - LLM은 "숫자를 지어내지 않는다" — 입력으로 준 지표만 근거로 서술을 쓴다.
// - API 키가 없으면 null을 돌려주고, 호출부는 기존 [대괄호] 템플릿을 그대로 둔다(키 게이트).
// - 결과는 "분석가 검토 전 초안"이며, 발행 전 사람이 확인한다(자동 발행 아님).
//   → AI 흔적을 숨기는 별도 레이어는 두지 않는다. 유료 상품의 신뢰 문제라, 대신
//     매뉴얼의 간결한 하우스 보이스로 쓰고 초안임을 명시한다.

export interface NarrativeInput {
  ticker: string
  name: string
  stageLabel: string // 예: "3단계", "4단계 4-A", "미판정"
  rule: string | null // 결정트리 규칙 기호(①~⑦) 또는 null
  lensType: string
  g1: number | null
  g2: number | null
  g3s: number | null
  g4: number | null
  kill: boolean
  revenueYoY: number | null
  grossMarginPct: number | null
  operatingMarginPct: number | null
  revenueSurprisePct: number | null
  epsSurprisePct: number | null
  drawdownPct: number | null // 52주 고점 대비 낙폭(양수 %)
  evToSales: number | null
  pe: number | null
  valuationPreProfit: boolean | null
  profileLabel: string | null
}

export interface Narrative {
  oneLiner: string // 한 줄 요약
  whyStage: string // "왜 N단계인가" 해석 (사실→해석→한계)
  falsification: string // 반증 조건 2~3개 (마크다운 불릿)
}

const HOUSE_VOICE = `당신은 투자 분석 구독 서비스의 시니어 애널리스트예요. 아래 규칙으로 한국어 보고서 초안의 "서술" 부분만 씁니다.

문체(하우스 보이스):
- 간결하고 단정적. 과장·홍보성 표현 금지("놀라운", "폭발적", "무조건" 등 금지).
- 측정 가능한 사실 우선. 형용사보다 숫자·조건.
- "매수/매도하세요" 같은 투자 권유 금지. 사업 가설과 그 반증 조건을 서술.
- 입력으로 주어진 지표 외의 수치를 지어내지 않는다. 모르면 "확인 필요"로 남긴다.

판정 체계(투자 매뉴얼 v4.1):
- 1단계=관망(G1/G2 미통과), 2단계=적립, 3단계=유지(추매 금지), 4단계=수확(4-A ride / 4-B 트림).
- 가격이 높다는 사실은 사업 가설의 부정이 아니다 — 밸류에이션은 "가격 위험" 레이어로만 다룬다.`

function fmt(v: number | null, digits = 1, suffix = '%'): string {
  return v === null ? '데이터 없음' : `${v.toFixed(digits)}${suffix}`
}

function buildUserPrompt(input: NarrativeInput): string {
  return `종목: [${input.ticker}] ${input.name}
현재 판정: ${input.stageLabel}${input.rule ? ` (규칙 ${input.rule})` : ''}
렌즈: ${input.lensType}
업종 프로필: ${input.profileLabel ?? '미지정'}

지표(이 값들만 근거로 사용):
- G1(수요) ${input.g1 ?? '미판정'} / G2(수익성) ${input.g2 ?? '미판정'} / G3s(모멘텀) ${input.g3s ?? '미판정'} / G4 ${input.g4 ?? '미판정'} / 킬 ${input.kill ? 'ON' : 'OFF'}
- 매출 YoY: ${fmt(input.revenueYoY)}
- 그로스마진: ${fmt(input.grossMarginPct)} / 영업마진: ${fmt(input.operatingMarginPct)}
- 매출 서프라이즈: ${fmt(input.revenueSurprisePct)} / EPS 서프라이즈: ${fmt(input.epsSurprisePct)}
- 52주 고점 대비 낙폭: ${fmt(input.drawdownPct)}
- 밸류에이션: ${input.valuationPreProfit ? '흑자 전(P/E 무의미)' : `EV/Sales ${fmt(input.evToSales, 1, '배')}, P/E ${fmt(input.pe, 1, '배')}`}

다음 3개를 써 주세요:
1. oneLiner: 한 줄 요약(한 문장). 투자 근거의 상태 + 확인된 모멘텀 + 남은 핵심 리스크.
2. whyStage: 왜 이 단계인가. "사실 → 해석 → 한계" 구조로 3~5문장. G1/G2/G3s를 근거로.
3. falsification: 이 가설이 틀릴 수 있는 조건 2~3개를 마크다운 불릿(- )으로. 각 조건은 측정 가능하게.`
}

const SCHEMA = {
  type: 'object',
  properties: {
    oneLiner: { type: 'string' },
    whyStage: { type: 'string' },
    falsification: { type: 'string' },
  },
  required: ['oneLiner', 'whyStage', 'falsification'],
  additionalProperties: false,
} as const

/**
 * 하우스 보이스 서술 초안을 생성한다. ANTHROPIC_API_KEY가 없으면 null(키 게이트) —
 * 호출부는 기존 [대괄호] 템플릿을 그대로 유지한다. 실패해도 null로 안전하게 떨어진다.
 */
export async function generateNarrative(input: NarrativeInput): Promise<Narrative | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: HOUSE_VOICE,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    })
    if (res.stop_reason === 'refusal') return null
    const textBlock = res.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null
    const parsed = JSON.parse(textBlock.text) as Partial<Narrative>
    if (!parsed.oneLiner || !parsed.whyStage || !parsed.falsification) return null
    return { oneLiner: parsed.oneLiner, whyStage: parsed.whyStage, falsification: parsed.falsification }
  } catch (err) {
    console.error('[narrative] generation failed', err)
    return null
  }
}
