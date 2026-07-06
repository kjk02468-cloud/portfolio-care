// Categorical series colors as CSS variables so they follow the active theme
// (light/dark steps are defined in globals.css). Fixed order — never cycled
// beyond slot 8; a 9th+ holding folds into an "기타" (Other) bucket in charts.
export const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)',
] as const

export const OTHER_COLOR = 'var(--text-muted)'
