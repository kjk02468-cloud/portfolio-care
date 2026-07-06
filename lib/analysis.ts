import { prisma } from './prisma'

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
  stocks: { id: string; ticker: string; name: string; held: boolean }[]
}

function excerpt(body: string, len = 160): string {
  const text = body.replace(/[#*`_>\-]/g, '').replace(/\s+/g, ' ').trim()
  return text.length > len ? text.slice(0, len) + '…' : text
}

/**
 * The core product feed: published posts whose ticker_tags intersect the
 * subscriber's held tickers, newest first. Each tagged stock is flagged `held`
 * so the UI can highlight "이 분석이 네 OOO에 영향".
 */
export async function getFeed(userId: string): Promise<FeedPost[]> {
  const tickers = await getMyTickers(userId)
  if (tickers.length === 0) return []

  const held = new Set(tickers)
  const posts = await prisma.analysisPost.findMany({
    where: {
      status: 'published',
      stocks: { some: { ticker: { in: tickers } } },
    },
    include: {
      stocks: { select: { id: true, ticker: true, name: true } },
      author: { select: { name: true } },
    },
    orderBy: { publishedAt: 'desc' },
  })

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    lensType: p.lensType,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    authorName: p.author.name,
    excerpt: excerpt(p.body),
    stocks: p.stocks.map((s) => ({
      id: s.id,
      ticker: s.ticker,
      name: s.name,
      held: held.has(s.ticker.toUpperCase()),
    })),
  }))
}

export interface PostDetail {
  id: string
  title: string
  body: string
  lensType: string
  themeTags: string[]
  publishedAt: string | null
  authorName: string | null
  stocks: { id: string; ticker: string; name: string; held: boolean }[]
  heldTickers: string[]
}

/** A single published post for subscribers, with held-ticker highlighting. */
export async function getPostForSubscriber(
  postId: string,
  userId: string,
): Promise<PostDetail | null> {
  const post = await prisma.analysisPost.findFirst({
    where: { id: postId, status: 'published' },
    include: {
      stocks: { select: { id: true, ticker: true, name: true } },
      author: { select: { name: true } },
    },
  })
  if (!post) return null

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
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorName: post.author.name,
    stocks,
    heldTickers: stocks.filter((s) => s.held).map((s) => s.ticker),
  }
}
