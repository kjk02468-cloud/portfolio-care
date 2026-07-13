// 투자 매뉴얼 v4.1 "업종별 G1·G2 치환표"를 자동 계산 가능한 지표로 매핑.
//
// 원칙: 벤더에서 못 구하는 지표(book-to-bill, ARR/NRR, RPO, backlog, 희석률,
// 파이프라인 진척)를 억지로 근사하지 않는다. 대신 매출 YoY·매출총이익률·영업이익률·
// EPS처럼 표준 재무제표에서 안전하게 구할 수 있는 지표로만 제안값을 낸다.
// 원문 KPI와 정확히 일치하는 항목은 caveat이 없고, 근사인 항목은 caveat에 그 이유를
// 남긴다 — 관리자 화면(Phase E)에서 "이건 근사치"라고 표시하는 데 쓴다.
// 벤더가 못 주는 항목은 threshold를 null로 두어 항상 '판정 보류'로 남긴다
// (숫자를 지어내지 않는다는 원칙, 세션 전체에서 지켜온 것과 동일).

export type IndustryProfileKey =
  | 'saas'
  | 'semiconductor'
  | 'ems'
  | 'memory_ip'
  | 'biotech'
  | 'pre_profit'
  | 'space'

export interface G1Config {
  /** null = 자동 제안 불가 → 항상 판정 보류. 있으면 매출 YoY(%) 임계값. */
  revenueYoYThresholdPct: number | null
  /** 원문 KPI와 근사의 차이 설명. 정확히 일치하면 null. */
  caveat: string | null
}

export interface G2Config {
  metric: 'grossMargin' | 'operatingMargin' | 'operatingMarginImproving' | 'epsImproving' | null
  /** metric이 임계형(grossMargin/operatingMargin)일 때만 사용. improving형은 추세 비교라 미사용. */
  thresholdPct: number | null
  caveat: string | null
}

export interface IndustryProfile {
  label: string
  g1: G1Config
  g2: G2Config
}

export const INDUSTRY_PROFILES: Record<IndustryProfileKey, IndustryProfile> = {
  saas: {
    label: 'SaaS/클라우드',
    g1: {
      revenueYoYThresholdPct: 30,
      caveat: '원문은 ARR YoY≥30%·NRR≥105% — 매출 YoY로 근사(ARR≠총매출일 수 있음)',
    },
    g2: {
      metric: 'operatingMarginImproving',
      thresholdPct: null,
      caveat: '원문은 "영업이익·FCF 개선"(추세) — 절대임계 아님. 영업이익률 전분기 대비 개선 여부로 판단, FCF는 미반영',
    },
  },
  semiconductor: {
    label: '반도체/하드웨어',
    g1: { revenueYoYThresholdPct: null, caveat: 'book-to-bill 데이터 벤더에서 확보 불가 — 자동 제안 없음(판정 보류)' },
    g2: { metric: null, thresholdPct: null, caveat: '원문이 수치 임계를 주지 않음("GM·수주 가시성") — 자동 제안 없음(판정 보류)' },
  },
  ems: {
    label: 'EMS(제조)',
    g1: {
      revenueYoYThresholdPct: 30,
      caveat: '원문은 AI서버·네트워크 매출(세그먼트) YoY≥30% — 총매출 YoY로 근사',
    },
    g2: { metric: 'operatingMargin', thresholdPct: 5, caveat: null }, // 원문과 정확히 일치
  },
  memory_ip: {
    label: '메모리 IP',
    g1: {
      revenueYoYThresholdPct: 15,
      caveat: '원문은 로열티 매출(세그먼트) YoY≥15% — 총매출 YoY로 근사',
    },
    g2: { metric: 'grossMargin', thresholdPct: 70, caveat: null }, // 원문과 정확히 일치
  },
  biotech: {
    label: '바이오',
    g1: {
      revenueYoYThresholdPct: 10,
      caveat: '원문은 핵심 제품(세그먼트) 매출 YoY≥10% — 총매출 YoY로 근사',
    },
    g2: {
      metric: 'epsImproving',
      thresholdPct: null,
      caveat: '원문은 "EPS 상향·파이프라인 진척 1건+" — EPS 추세만 반영, 파이프라인은 벤더에서 확보 불가',
    },
  },
  pre_profit: {
    label: 'pre-profit/바이너리',
    g1: { revenueYoYThresholdPct: null, caveat: 'RPO·계약 순증 데이터 벤더에서 확보 불가 — 자동 제안 없음(판정 보류)' },
    g2: { metric: null, thresholdPct: null, caveat: '희석률 계산에 필요한 유통주식수 데이터 미확보 — 자동 제안 없음(판정 보류)' },
  },
  space: {
    label: '우주',
    g1: { revenueYoYThresholdPct: 25, caveat: null }, // 원문과 정확히 일치(분기 매출 YoY≥25%)
    g2: { metric: null, thresholdPct: null, caveat: 'backlog 데이터 벤더에서 확보 불가 — 자동 제안 없음(판정 보류)' },
  },
}

export const INDUSTRY_PROFILE_KEYS = Object.keys(INDUSTRY_PROFILES) as IndustryProfileKey[]

/**
 * 매뉴얼 §A.5 히스테리시스: 임계 ~ 임계−1%p 구간이면 직전 분기(확정값) 유지.
 * 임계 이상이면 통과(1), 임계−1%p 미만이면 명확히 미통과(0). 구간 안이면
 * prevConfirmed가 있으면 그 값 유지, 없으면(신규 종목 등) 판정 보류(null).
 */
export function applyHysteresis(
  value: number | null,
  thresholdPct: number | null,
  prevConfirmed: 0 | 1 | null,
): 0 | 1 | null {
  if (value === null || thresholdPct === null) return null
  if (value >= thresholdPct) return 1
  if (value < thresholdPct - 1) return 0
  return prevConfirmed
}

/** epsImproving 등 추세 판정 — QoQ 변화가 미미하면(밴드 내) 직전 확정값 유지. */
export function applyTrendHysteresis(
  current: number | null,
  previous: number | null,
  prevConfirmed: 0 | 1 | null,
  bandAbs = 0.01,
): 0 | 1 | null {
  if (current === null || previous === null) return null
  const delta = current - previous
  if (delta > bandAbs) return 1
  if (delta < -bandAbs) return 0
  return prevConfirmed
}
