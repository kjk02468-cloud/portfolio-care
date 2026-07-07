import { prisma } from './prisma'
import { LENS_TYPES, type LensTypeValue } from './lens'
import { summarizeLensFields } from './lens-fields'

/** Distinct tickers a subscriber holds, derived from their transactions. */
export async function getMyTickers(userId: string): Promise<string[]> {
  const rows = await prisma.transaction.findMany({
    where: { portfolio: { userId } },
    select: { symbol: true },
    distinct: ['symbol'],
  })
  // Uppercase + dedupe (symbols are stored uppercased, but be defensive).
  return Array.from(new Set(rows.map((r) => r.symbol.toUpperCase())))
}

export interface FeedPost {
  id: string
  title: string
  lensType: string
  publishedAt: string | null
  authorName: string | null
  excerpt: string
  lensSummary: string
  stocks: { id: string; ticker: string; name: string; held: boolean }[]
}

function excerpt(body: string, len = 160): string {
  const text = body.replace(/[#*`_>\-]/g, '').replace(/\s+/g, ' ').trim()
  return text.length > len ? text.slice(0, len) + '…' : text
}

const POST_INCLUDE = {
  stocks: { select: { id: true, ticker: true, name: true } },
  author: { select: { name: true } },
} as const

type PostRow = {
  id: string
  title: string
  lensType: string
  body: string
  lensFields: string | null
  publishedAt: Date | null
  author: { name: string | null }
  stocks: { id: string; ticker: string; name: string }[]
}

function parseFields(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toFeedPost(p: PostRow, held: Set<string>): FeedPost {
  return {
    id: p.id,
    title: p.title,
    lensType: p.lensType,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    authorName: p.author.name,
    excerpt: excerpt(p.body),
    lensSummary: summarizeLensFields(p.lensType, parseFields(p.lensFields)),
    stocks: p.stocks.map((s) => ({
      id: s.id,
      ticker: s.ticker,
      name: s.name,
      held: held.has(s.ticker.toUpperCase()),
    })),
  }
}

/**
 * The core product feed: published posts whose ticker_tags intersect the
 * subscriber's held tickers, newest first. Optionally narrowed to one lens.
 * Each tagged stock is flagged `held` so the UI can highlight the impact.
 */
export async function getFeed(
  userId: string,
  lens?: LensTypeValue,
): Promise<FeedPost[]> {
  const tickers = await getMyTickers(userId)
  if (tickers.length === 0) return []

  const held = new Set(tickers)
  const posts = await prisma.analysisPost.findMany({
    where: {
      status: 'published',
      ...(lens ? { lensType: lens } : {}),
      stocks: { some: { ticker: { in: tickers } } },
    },
    include: POST_INCLUDE,
    orderBy: { publishedAt: 'desc' },
  })
  return posts.map((p) => toFeedPost(p, held))
}

/**
 * Lens browse: ALL published posts (optionally one lens), newest first, but
 * posts tagged with a ticker the subscriber holds float to the top and are
 * highlighted — "그중 내 보유 종목이 태그된 글은 상단/하이라이트".
 */
export async function getLensBrowse(
  userId: string,
  lens?: LensTypeValue,
): Promise<FeedPost[]> {
  const held = new Set(await getMyTickers(userId))
  const posts = await prisma.analysisPost.findMany({
    where: {
      status: 'published',
      ...(lens ? { lensType: lens } : {}),
    },
    include: POST_INCLUDE,
    orderBy: { publishedAt: 'desc' },
  })
  const mapped = posts.map((p) => toFeedPost(p, held))
  // Stable partition: held-tagged posts first, order within each group kept.
  const mine = mapped.filter((p) => p.stocks.some((s) => s.held))
  const rest = mapped.filter((p) => !p.stocks.some((s) => s.held))
  return [...mine, ...rest]
}

export interface LensGroup {
  lensType: string
  posts: FeedPost[]
}

/**
 * All published posts tagged with one ticker, grouped by lens — the "한 종목에
 * 달린 5개 렌즈 분석을 렌즈별로 모아 보기" view on the stock detail page.
 */
export async function getStockPosts(
  ticker: string,
  userId: string,
): Promise<LensGroup[]> {
  const held = new Set(await getMyTickers(userId))
  const posts = await prisma.analysisPost.findMany({
    where: {
      status: 'published',
      stocks: { some: { ticker: ticker.toUpperCase() } },
    },
    include: POST_INCLUDE,
    orderBy: { publishedAt: 'desc' },
  })
  const groups = new Map<string, FeedPost[]>()
  for (const p of posts) {
    const fp = toFeedPost(p, held)
    const list = groups.get(fp.lensType) ?? []
    list.push(fp)
    groups.set(fp.lensType, list)
  }
  // Keep lens display order consistent with LENS_TYPES.
  return LENS_TYPES.filter((l) => groups.has(l)).map((l) => ({
    lensType: l,
    posts: groups.get(l)!,
  }))
}

export interface PostDetail {
  id: string
  title: string
  body: string
  lensType: string
  themeTags: string[]
  lensFields: Record<string, unknown>
  publishedAt: string | null
  authorName: string | null
  stocks: { id: string; ticker: string; name: string; held: boolean }[]
  heldTickers: string[]
  related: { id: string; title: string; lensType: string }[]
}

function parseStoredLensFields(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** A single published post for subscribers, with held-ticker highlighting. */
export async function getPostForSubscriber(
  postId: string,
  userId: string,
): Promise<PostDetail | null> {
  const relatedSelect = {
    where: { status: 'published' as const },
    select: { id: true, title: true, lensType: true },
  }
  const post = await prisma.analysisPost.findFirst({
    where: { id: postId, status: 'published' },
    include: {
      stocks: { select: { id: true, ticker: true, name: true } },
      author: { select: { name: true } },
      relatedTo: relatedSelect,
      relatedFrom: relatedSelect,
    },
  })
  if (!post) return null

  // Mutual: union of both directions, deduped by id.
  const relatedMap = new Map<string, { id: string; title: string; lensType: string }>()
  for (const r of [...post.relatedTo, ...post.relatedFrom]) relatedMap.set(r.id, r)

  const held = new Set(await getMyTickers(userId))
  const stocks = post.stocks.map((s) => ({
    id: s.id,
    ticker: s.ticker,
    name: s.name,
    held: held.has(s.ticker.toUpperCase()),
  }))

  return {
    id: post.id,
    title: post.title,
    body: post.body,
    lensType: post.lensType,
    themeTags: (post.themeTags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    lensFields: parseStoredLensFields(post.lensFields),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorName: post.author.name,
    stocks,
    heldTickers: stocks.filter((s) => s.held).map((s) => s.ticker),
    related: Array.from(relatedMap.values()),
  }
}
