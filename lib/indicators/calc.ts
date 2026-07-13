import type { PriceBar } from './types'

// ── G4 (가격 과열/여유) — 매뉴얼 §A.3, 그대로 이식 ────────────────────────────
// drawdown = (52주 고점 − 현재가) / 52주 고점. >20%면 여유(1), 아니면 과열(0).
const G4_DRAWDOWN_THRESHOLD = 0.2

export interface DrawdownResult {
  price: number
  high52w: number
  drawdownPct: number
  g4Suggested: 0 | 1
}

export function computeDrawdown(bars: PriceBar[]): DrawdownResult | null {
  if (bars.length === 0) return null
  const price = bars[bars.length - 1].close
  const high52w = Math.max(...bars.map((b) => b.high))
  const drawdownPct = high52w > 0 ? (high52w - price) / high52w : 0
  return {
    price,
    high52w,
    drawdownPct,
    g4Suggested: drawdownPct > G4_DRAWDOWN_THRESHOLD ? 1 : 0,
  }
}

/** 단순이동평균(종가 기준). 데이터가 기간보다 짧으면 null(판정 보류). */
export function computeMovingAverage(bars: PriceBar[], period: number): number | null {
  if (bars.length < period) return null
  const window = bars.slice(bars.length - period)
  const sum = window.reduce((acc, b) => acc + b.close, 0)
  return sum / period
}

/** ATR(Average True Range) — 단순평균 기반(와일더 평활 아님, 결정적 계산 우선). */
export function computeATR(bars: PriceBar[], period = 14): number | null {
  if (bars.length < period + 1) return null
  const trueRanges: number[] = []
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]
    const prevClose = bars[i - 1].close
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose),
    )
    trueRanges.push(tr)
  }
  const window = trueRanges.slice(trueRanges.length - period)
  return window.reduce((acc, v) => acc + v, 0) / period
}

/** 최근 거래량 / 최근 period일 평균 거래량. 1보다 크면 평균 대비 증가. */
export function computeVolumeAvgRatio(bars: PriceBar[], period = 20): number | null {
  if (bars.length < period) return null
  const window = bars.slice(bars.length - period)
  const avg = window.reduce((acc, b) => acc + b.volume, 0) / period
  if (avg === 0) return null
  const latest = bars[bars.length - 1].volume
  return latest / avg
}

/** 최근 lookback일 저가·고가 — 단순 근사 지지·저항(스윙포인트 탐지 아님). */
export function computeSupportResistance(
  bars: PriceBar[],
  lookback = 60,
): { support: number; resistance: number } | null {
  if (bars.length === 0) return null
  const window = bars.slice(Math.max(0, bars.length - lookback))
  return {
    support: Math.min(...window.map((b) => b.low)),
    resistance: Math.max(...window.map((b) => b.high)),
  }
}

export type TrendLabel = '중기 상승 추세' | '중기 하락 추세' | '추세 혼조·전환 구간' | '판정 보류'

export function describeTrend(price: number, ma50: number | null, ma200: number | null): TrendLabel {
  if (ma50 === null || ma200 === null) return '판정 보류'
  if (price > ma50 && ma50 > ma200) return '중기 상승 추세'
  if (price < ma50 && ma50 < ma200) return '중기 하락 추세'
  return '추세 혼조·전환 구간'
}

export type VolatilityLabel = '변동성 높음' | '변동성 보통' | '변동성 낮음' | '판정 보류'

// ATR/price 비율 버킷 — 임의 임계값(휴리스틱). 종목군별 캘리브레이션은 후속 과제.
export function describeVolatility(atr: number | null, price: number): VolatilityLabel {
  if (atr === null || price <= 0) return '판정 보류'
  const pct = atr / price
  if (pct > 0.04) return '변동성 높음'
  if (pct > 0.02) return '변동성 보통'
  return '변동성 낮음'
}

export type VolumeLabel = '거래량 평균 대비 급증' | '거래량 평균 수준' | '거래량 저조' | '판정 보류'

export function describeVolume(volAvgRatio: number | null): VolumeLabel {
  if (volAvgRatio === null) return '판정 보류'
  if (volAvgRatio > 1.5) return '거래량 평균 대비 급증'
  if (volAvgRatio > 0.7) return '거래량 평균 수준'
  return '거래량 저조'
}

export interface ChartIndicators {
  price: number
  high52w: number
  drawdownPct: number
  g4Suggested: 0 | 1
  ma50: number | null
  ma200: number | null
  atr14: number | null
  volAvgRatio: number | null
  support: number | null
  resistance: number | null
  trend: TrendLabel
  volatility: VolatilityLabel
  volume: VolumeLabel
}

/** 일봉에서 G4 + 차트·수급 카드에 필요한 지표를 한 번에 계산. */
export function computeChartIndicators(bars: PriceBar[]): ChartIndicators | null {
  const drawdown = computeDrawdown(bars)
  if (!drawdown) return null

  const ma50 = computeMovingAverage(bars, 50)
  const ma200 = computeMovingAverage(bars, 200)
  const atr14 = computeATR(bars, 14)
  const volAvgRatio = computeVolumeAvgRatio(bars, 20)
  const sr = computeSupportResistance(bars, 60)

  return {
    ...drawdown,
    ma50,
    ma200,
    atr14,
    volAvgRatio,
    support: sr?.support ?? null,
    resistance: sr?.resistance ?? null,
    trend: describeTrend(drawdown.price, ma50, ma200),
    volatility: describeVolatility(atr14, drawdown.price),
    volume: describeVolume(volAvgRatio),
  }
}
