import { prisma } from './prisma'
import { judgeStock, STAGE_META, type StockJudgeMaybe } from './stage-judge'
import {
  describeTrend,
  describeVolatility,
  describeVolume,
  computeSupportResistance,
} from './indicators/calc'
import { INDUSTRY_PROFILES, type IndustryProfileKey } from './indicators/industry-profiles'
import { generateNarrative, type NarrativeInput } from './report-narrative'
import type { LensTypeValue } from './lens'

// 자동 초안 생성 — 지표·재무·판정 결과로 §9 템플릿의 "숫자·표" 부분만 채운다.
// 서술(한 줄 요약·왜 N단계인가의 해석·반증 조건·밸류에이션 배수)은 분석가 판단이
// 필요해서 원본 템플릿의 [대괄호] 자리로 그대로 남긴다 — 숫자는 채우고 판단은
// 지어내지 않는다는 이 세션 전체의 원칙을 그대로 따른다.

const na = (v: number | null | undefined, digits = 1, suffix = '%') =>
  v === null || v === undefined ? '[데이터 없음]' : `${v.toFixed(digits)}${suffix}`

function judgedStatusLabel(g1: number | null, g2: number | null): string {
  if (g1 === null || g2 === null) return '확인 중'
  return g1 === 1 && g2 === 1 ? '충족' : '미충족'
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// 자동 계산된 밸류에이션 배수를 한 줄로. 흑자 전이면 P/E는 무의미로 표기(매뉴얼).
function buildValuationLine(
  ind: {
    evToSales: number | null
    pe: number | null
    evToSalesMedian5y: number | null
    peMedian5y: number | null
    valuationPreProfit: boolean | null
    evToSalesVsMedianPct: number | null
    peVsMedianPct: number | null
  } | null | undefined,
): string {
  if (!ind || (ind.evToSales === null && ind.pe === null)) {
    return '[배수 데이터 미확보 — 직접 입력]'
  }
  const num = (v: number | null, digits = 1) => (v === null ? '—' : v.toFixed(digits))
  const vs = (v: number | null) =>
    v === null ? '' : ` (5년 중앙값 대비 ${v >= 0 ? '+' : ''}${v.toFixed(0)}%)`
  const parts: string[] = []
  if (ind.evToSales !== null) {
    parts.push(
      `EV/Sales ${num(ind.evToSales)}배 (중앙값 ${num(ind.evToSalesMedian5y)})${vs(ind.evToSalesVsMedianPct)}`,
    )
  }
  if (ind.valuationPreProfit) {
    parts.push('P/E: 흑자 전이라 무의미')
  } else if (ind.pe !== null) {
    parts.push(`P/E ${num(ind.pe)}배 (중앙값 ${num(ind.peMedian5y)})${vs(ind.peVsMedianPct)}`)
  }
  return parts.join(' · ') || '[배수 데이터 미확보 — 직접 입력]'
}

export async function generateReportDraft(
  stockId: string,
  lensType: LensTypeValue,
  withNarrative = false,
): Promise<string> {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    include: {
      autoIndicator: true,
      stageChanges: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!stock) throw new Error('종목을 찾을 수 없어요.')

  if (lensType === 'macro') {
    // 거시는 종목 G값과 독립 — 종목별 자동 초안 대상이 아님.
    throw new Error('거시 렌즈는 종목별 자동 초안 대상이 아니에요.')
  }

  const reports = await prisma.stockQuarterlyReport.findMany({
    where: { stockId },
    orderBy: { periodEnd: 'desc' },
    take: 1,
  })
  const latestReport = reports[0]

  const bars = await prisma.stockPriceBar.findMany({
    where: { stockId },
    orderBy: { date: 'asc' },
    take: 400,
  })
  const sr =
    bars.length > 0
      ? computeSupportResistance(
          bars.map((b) => ({
            date: b.date.toISOString().slice(0, 10),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume,
          })),
        )
      : null

  const judged: StockJudgeMaybe = judgeStock(stock)
  const stageLabel = judged.judged
    ? `${STAGE_META[judged.stage].label}${judged.subtype ? ` ${judged.subtype}` : ''}`
    : '미판정'

  const ind = stock.autoIndicator
  const asOf = ind ? formatDate(ind.asOf) : formatDate(new Date())
  const drawdownPctDisplay = ind?.drawdownPct !== null && ind?.drawdownPct !== undefined
    ? -(ind.drawdownPct * 100)
    : null
  const trend = ind ? describeTrend(ind.price ?? 0, ind.ma50, ind.ma200) : '판정 보류'
  const volatility = ind ? describeVolatility(ind.atr14, ind.price ?? 0) : '판정 보류'
  const volume = ind ? describeVolume(ind.volAvgRatio) : '판정 보류'

  const profile =
    stock.industryProfile && stock.industryProfile in INDUSTRY_PROFILES
      ? INDUSTRY_PROFILES[stock.industryProfile as IndustryProfileKey]
      : null

  const head = `# [${stock.ticker}] ${stock.name}

**${stageLabel}** · 기준일 ${asOf} · 다음 정기 점검 [YYYY-MM-DD]

> **한 줄 요약**
> [투자 근거]는 [상태]입니다. [모멘텀 근거]가 확인됐지만, [가격/핵심 리스크]는 추가 확인이 필요합니다.

## 판정 요약

| 항목 | 상태 | 핵심 근거 |
|---|---|---|
| 투자 근거 | ${judgedStatusLabel(stock.g1, stock.g2)} | 매출YoY ${na(ind?.revenueYoY)}${profile ? ` (임계 ${profile.g1.revenueYoYThresholdPct ?? '—'}%)` : ''}, GM ${na(ind?.grossMarginPct)} / OPM ${na(ind?.operatingMarginPct)} |
| 실적 모멘텀 | ${stock.g3s ?? '[미판정]'}/4 | 매출서프 ${na(ind?.revenueSurprisePct)}, EPS서프 ${na(ind?.epsSurprisePct)} (실제 vs 컨센서스) |
| 가격·밸류에이션 | [입력 필요] | 52주 고점 대비 ${na(drawdownPctDisplay)} · ${volatility} |
| 핵심 리스크 | [등급] | [측정 가능한 한 문장] |

## 왜 [${judged.judged ? judged.stage : 'N'}]단계인가

1. **수요(G1):** [사실]. 따라서 [해석]. 다만 [한계]. (참고: 매출YoY ${na(ind?.revenueYoY)}${profile?.g1.caveat ? ` — ${profile.g1.caveat}` : ''})
2. **수익성(G2):** [사실]. 따라서 [해석]. 다만 [한계]. (참고: GM ${na(ind?.grossMarginPct)}, OPM ${na(ind?.operatingMarginPct)}${profile?.g2.caveat ? ` — ${profile.g2.caveat}` : ''})
3. **실적 기대(G3s):** [추정치 변화와 직접 원인]. [추정치 수 / 갱신일]. (참고: 이번 분기 매출서프 ${na(ind?.revenueSurprisePct)}, EPS서프 ${na(ind?.epsSurprisePct)}, 매출YoY ${na(ind?.revenueYoY)} vs 전분기 ${na(ind?.revenueYoYPrev)})`

  const evidence = buildLensEvidence(lensType, ind, latestReport, profile)

  const valuationLine = buildValuationLine(ind)
  const priceBlock = `## 가격·밸류에이션 (사업 단계와 분리)

- **가격 위치:** 52주 고점 대비 ${na(drawdownPctDisplay)} (52주 고점 ${na(ind?.high52w, 2, '')}, 현재가 ${na(ind?.price, 2, '')})
- **밸류에이션(자동):** ${valuationLine}
  - 흑자 전(pre-profit): EV/Sales · PSR · RPO 배수 (P/E 무의미)
  - 흑자 기업: P/E · EV/EBITDA · FCF yield
- **시장 위험:** ${volatility} (ATR14 ${na(ind?.atr14, 2, '')})

> 가격이 높다는 사실은 사업 가설의 부정이 아님. G1·G2가 통과인 한 사업 근거는 유효하며,
> "과열"은 가격·밸류에이션 위험으로만 표기(4-B = "사업 개선 지속 + 가격 위험 주의").`

  const chartBlock = `## 차트·수급 (진입 타이밍·가격 위험 — 단계 판정과 독립)

| 항목 | 확인 지표 | 판단 |
|---|---|---|
| 추세 | 50일·200일 이동평균, 고점·저점 구조 | ${trend} (MA50 ${na(ind?.ma50, 2, '')}, MA200 ${na(ind?.ma200, 2, '')}) |
| 가격 위치 | 52주 고점 대비 낙폭, 이평선 이격도 | 52주 고점 대비 ${na(drawdownPctDisplay)} |
| 변동성 | ATR·최근 변동성 | ${volatility} (ATR14 ${na(ind?.atr14, 2, '')}) |
| 거래량 | 돌파/하락 시 평균 대비 거래량 | ${volume} (평균 대비 ${na(ind?.volAvgRatio, 2, '배')}) |
| 지지·저항 | 최근 횡보 구간·전고점 | ${sr ? `지지 ${sr.support.toFixed(2)} / 저항 ${sr.resistance.toFixed(2)} (최근 60거래일 근사)` : '[데이터 없음]'} |

> 차트는 **1~4단계 분류를 바꾸지 않음.** 과열이면 "4-B: 사업 개선 지속·가격 위험 주의"
> 또는 "신규 진입 대기"의 근거로만 사용. 추세가 훼손돼도 논리를 즉시 폐기하지 않고
> 실적·수요 반증 조건을 재확인. 주관적 표현("차트 좋아 보임") 금지 — 지표 3~5개 고정.`

  const killNote = ind
    ? [
        ind.killRevenueDecline2q ? '매출 2분기 역성장' : null,
        ind.killMarginDecline2q ? '마진 2분기 연속 하락' : null,
        ind.killGuidanceCut2q ? '가이던스 컷 2분기 연속' : null,
      ]
        .filter(Boolean)
        .join(', ')
    : ''

  const tail = `## 무엇이 틀릴 수 있나 (반증 조건 — 사전 정의)

| 반증 조건 | 확인 지표 | 발생 시 | 확인 시점 |
|---|---|---|---|
| [수요 둔화 조건] | [매출·백로그 수치] | G1 재평가 | 다음 실적 발표 |
| [마진 악화 조건] | [OPM 하단 기준] | G2 재평가 | 분기 실적 |
| [기대 하향 조건] | [NTM 매출·EPS 하향] | G3s −1 | 실적 후 3거래일 |
| [가격 위험 조건] | [밸류에이션 상단 초과] | 단계 변경 없이 가격 경고 | 주간 |
${killNote ? `\n> 참고 — 수치형 킬 확인 신호 감지: ${killNote}. 판정 아님, 질적 확인 후 반영.\n` : ''}
> 반증 조건은 **사전에** 정의. 주가가 내린 뒤 이유를 찾아 붙이지 않음.

## 판정 이력

| 날짜 | 변경 전 → 후 | 직접 원인 | 바뀌지 않은 것 | 출처 |
|---|---|---|---|---|
${
    stock.stageChanges.length > 0
      ? stock.stageChanges
          .map(
            (c) =>
              `| ${formatDate(c.createdAt)} | ${c.fromStage} → ${c.toStage} | ${c.directCause} | ${c.unchanged ?? '—'} | ${c.source === 'apply' ? '보고서 발행' : '수동 보정'} |`,
          )
          .join('\n')
      : '| [YYYY-MM-DD] | [전 단계] → [현 단계] | [직접 사실] | [유지된 판정] | [출처] |'
  }

## 데이터와 한계

- 출처: ${ind?.source ?? '[실적 공시 / IR / FactSet 등]'}
- 데이터 기준일: ${asOf}
- 데이터 부족 항목은 해당 G값을 비워 '판정 보류'(미판정)로 남김.`

  // AI 서술 초안(선택) — 키가 있고 요청됐을 때만. 매뉴얼 하우스 보이스로 쓰되
  // "분석가 검토 전 초안"임을 명시하고, 아래 [대괄호] 스켈레톤은 그대로 둔다.
  let narrativeBlock = ''
  if (withNarrative && judged.judged) {
    const narrative = await generateNarrative({
      ticker: stock.ticker,
      name: stock.name,
      stageLabel,
      rule: judged.judged ? judged.rule : null,
      lensType,
      g1: stock.g1,
      g2: stock.g2,
      g3s: stock.g3s,
      g4: stock.g4,
      kill: stock.kill,
      revenueYoY: ind?.revenueYoY ?? null,
      grossMarginPct: ind?.grossMarginPct ?? null,
      operatingMarginPct: ind?.operatingMarginPct ?? null,
      revenueSurprisePct: ind?.revenueSurprisePct ?? null,
      epsSurprisePct: ind?.epsSurprisePct ?? null,
      drawdownPct: drawdownPctDisplay,
      evToSales: ind?.evToSales ?? null,
      pe: ind?.pe ?? null,
      valuationPreProfit: ind?.valuationPreProfit ?? null,
      profileLabel: profile?.label ?? null,
    } satisfies NarrativeInput)
    if (narrative) {
      narrativeBlock = `> 🤖 **AI 서술 초안 (분석가 검토 전 — 발행 전 반드시 확인)**
>
> **한 줄 요약:** ${narrative.oneLiner}
>
> **왜 ${stageLabel}인가:** ${narrative.whyStage}
>
> **반증 조건:**
${narrative.falsification
  .split('\n')
  .map((l) => `> ${l}`)
  .join('\n')}
>
> _위 서술은 자동 생성 초안이에요. 아래 스켈레톤을 채우며 사실 여부·표현을 직접 검토·수정하세요._`
    }
  }

  const blocks = narrativeBlock
    ? [head, narrativeBlock, evidence, priceBlock, chartBlock, tail]
    : [head, evidence, priceBlock, chartBlock, tail]
  return blocks.join('\n\n')
}

function buildLensEvidence(
  lensType: Exclude<LensTypeValue, 'macro'>,
  ind: { revenueYoY: number | null; revenueYoYPrev: number | null; revenueSurprisePct: number | null; epsSurprisePct: number | null; grossMarginPct: number | null; operatingMarginPct: number | null } | null | undefined,
  latestReport: { revenue: number | null; epsActual: number | null; epsEstimate: number | null; revenueEstimate: number | null } | undefined,
  profile: { g1: { revenueYoYThresholdPct: number | null; caveat: string | null }; g2: { thresholdPct: number | null; caveat: string | null } } | null,
): string {
  switch (lensType) {
    case 'earnings':
      return `## 컨센서스 변화 (G3 근거)

- 자동 계산(서프라이즈 프록시): 매출 서프라이즈 ${na(ind?.revenueSurprisePct)}, EPS 서프라이즈 ${na(ind?.epsSurprisePct)} (실제 vs 컨센서스)
- 매출 YoY: 이번 분기 ${na(ind?.revenueYoY)} vs 전분기 ${na(ind?.revenueYoYPrev)}
- NTM EPS: 이전 → 이후 (변화율 %) — [유료 추정치 피드 없이는 직접 입력]
- NTM Revenue: 이전 → 이후 (변화율 %) — [유료 추정치 피드 없이는 직접 입력]
- **판정:** 둘 다 ≥ +1.0% 상향이면 G3=1(→ G3s +1), 아니면 G3=0(→ G3s −1) (§A.1·§A.2)

## 분기 핵심 지표

- 매출(실제/컨센서스): ${na(latestReport?.revenue, 0, '')} / ${na(latestReport?.revenueEstimate, 0, '')}
- EPS(실제/컨센서스): ${na(latestReport?.epsActual, 2, '')} / ${na(latestReport?.epsEstimate, 2, '')}
- (가이던스 등 — 렌즈 필드와 동일하게, 직접 입력)`
    case 'financials':
      return `## 핵심 재무 항목 (G2 근거)

- 자동 계산: 그로스마진 ${na(ind?.grossMarginPct)}, 영업마진 ${na(ind?.operatingMarginPct)}${
        profile ? ` (업종 프로필 임계 ${profile.g2.thresholdPct ?? '—'}%${profile.g2.caveat ? `, ${profile.g2.caveat}` : ''})` : ' — 업종 프로필 미지정, 종목 관리에서 설정 필요'
      }
- 히스테리시스 띠 여부: (임계~임계−1%p면 직전 분기 G2 유지, §A.5)
- **판정:** 임계 통과 → G2=1 / 미통과 → G2=0`
    case 'valuechain':
      return `## 산업·체인 구조

- (어느 산업의 밸류체인 / 병목 단계 — 렌즈 필드와 동일하게)

## 수요 신호 (G1 근거)

- 자동 계산(매출YoY 프록시): ${na(ind?.revenueYoY)}${
        profile ? ` (업종 프로필 임계 ${profile.g1.revenueYoYThresholdPct ?? '—'}%${profile.g1.caveat ? `, ${profile.g1.caveat}` : ''})` : ' — 업종 프로필 미지정, 종목 관리에서 설정 필요'
      }
- book-to-bill / 수주·백로그: [벤더에서 확보 불가 — 직접 입력]
- **판정:** 조건 통과 → G1=1 / 미통과 → G1=0`
    case 'news':
      return `## 사건 요약

- (무슨 일이 있었나 — 원문 링크는 렌즈 필드에)

## 영향 판단

- (호재 / 악재 / 중립 + 강도 — 시장·태그 종목에 미칠 영향)

## 킬라인 해당 여부 (§A.6)

- 해당 종목 킬 조건(AND 조건)에 걸리는지: (예 / 아니오 + 근거)
- 주의: 추정치 상향 멈춤 **단독**은 G3=0(강등 1칸)이지 킬 아님`
  }
}
