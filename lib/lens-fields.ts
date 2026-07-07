import { z } from 'zod'
import type { LensTypeValue } from './lens'

// ── Per-lens structured fields (lens_fields) ─────────────────────────────────
// Stored as JSON on AnalysisPost.lensFields. All fields are optional so a post
// can be published before every detail is filled in.

const keyValue = z.object({ key: z.string().trim(), value: z.string().trim() })

export const earningsFields = z.object({
  quarter: z.string().trim().max(40).optional(),
  surprise: z.enum(['beat', 'inline', 'miss']).optional(),
  keyMetrics: z.array(keyValue).default([]),
})

export const valuechainFields = z.object({
  industry: z.string().trim().max(120).optional(),
  chainSteps: z.array(z.string().trim()).default([]),
  bottleneckStep: z.string().trim().max(120).optional(),
  capitalConcentration: z.string().trim().max(2000).optional(),
})

export const macroFields = z.object({
  indicators: z.array(z.string().trim()).default([]),
  direction: z.string().trim().max(120).optional(),
  marketImpact: z.string().trim().max(2000).optional(),
  portfolioImpact: z.string().trim().max(2000).optional(),
})

export const newsFields = z.object({
  sourceUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  impactDirection: z.enum(['positive', 'negative', 'neutral']).optional(),
  strength: z.enum(['strong', 'medium', 'weak']).optional(),
})

export const financialsFields = z.object({
  perTickerKeyItems: z
    .array(z.object({ ticker: z.string().trim(), items: z.string().trim() }))
    .default([]),
})

export const LENS_FIELD_SCHEMAS = {
  earnings: earningsFields,
  valuechain: valuechainFields,
  macro: macroFields,
  news: newsFields,
  financials: financialsFields,
} as const

export type EarningsFields = z.infer<typeof earningsFields>
export type ValuechainFields = z.infer<typeof valuechainFields>
export type MacroFields = z.infer<typeof macroFields>
export type NewsFields = z.infer<typeof newsFields>
export type FinancialsFields = z.infer<typeof financialsFields>

export type LensFields =
  | EarningsFields
  | ValuechainFields
  | MacroFields
  | NewsFields
  | FinancialsFields

/** Validate raw lens fields against the schema for a lens; returns {} on miss. */
export function parseLensFields(
  lensType: LensTypeValue,
  raw: unknown,
): Record<string, unknown> {
  const schema = LENS_FIELD_SCHEMAS[lensType]
  const result = schema.safeParse(raw ?? {})
  return result.success ? (result.data as Record<string, unknown>) : {}
}

// Human labels for the constrained option values.
export const SURPRISE_LABELS: Record<string, string> = {
  beat: '상회',
  inline: '부합',
  miss: '하회',
}
export const IMPACT_LABELS: Record<string, string> = {
  positive: '호재',
  negative: '악재',
  neutral: '중립',
}
export const STRENGTH_LABELS: Record<string, string> = {
  strong: '강',
  medium: '중',
  weak: '약',
}

/** A one-line summary of the lens fields for feed cards (empty if nothing set). */
export function summarizeLensFields(
  lensType: string,
  f: Record<string, unknown>,
): string {
  const s = (k: string) => (typeof f[k] === 'string' ? (f[k] as string) : '')
  const parts: string[] = []
  if (lensType === 'earnings') {
    if (s('quarter')) parts.push(s('quarter'))
    if (s('surprise')) parts.push(SURPRISE_LABELS[s('surprise')] ?? s('surprise'))
  } else if (lensType === 'valuechain') {
    if (s('industry')) parts.push(s('industry'))
    if (s('bottleneckStep')) parts.push(`병목: ${s('bottleneckStep')}`)
  } else if (lensType === 'macro') {
    if (s('direction')) parts.push(`방향: ${s('direction')}`)
  } else if (lensType === 'news') {
    if (s('impactDirection'))
      parts.push(IMPACT_LABELS[s('impactDirection')] ?? s('impactDirection'))
    if (s('strength')) parts.push(STRENGTH_LABELS[s('strength')] ?? s('strength'))
  }
  return parts.join(' · ')
}
