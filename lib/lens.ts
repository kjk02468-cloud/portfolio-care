// The five analysis lenses. These are values of AnalysisPost.lensType — NOT
// separate models or pages. Defined as a plain string union (independent of the
// Prisma client) so client components can import the labels without pulling in
// the DB layer.
export const LENS_TYPES = [
  'earnings',
  'valuechain',
  'macro',
  'news',
  'financials',
] as const

export type LensTypeValue = (typeof LENS_TYPES)[number]

export const LENS_LABELS: Record<LensTypeValue, string> = {
  earnings: '실적',
  valuechain: '밸류체인',
  macro: '거시',
  news: '뉴스',
  financials: '재무',
}

export function lensLabel(v: string): string {
  return (LENS_LABELS as Record<string, string>)[v] ?? v
}
