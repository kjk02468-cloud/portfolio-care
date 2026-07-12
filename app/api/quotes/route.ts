import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQuotes } from '@/lib/market'

// GET /api/quotes?symbols=AAPL,MSFT,BTC-USD
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('symbols') ?? ''
  const symbols = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} })
  }
  if (symbols.length > 50) {
    return NextResponse.json(
      { error: 'Too many symbols (max 50)' },
      { status: 400 },
    )
  }

  const quotes = await getQuotes(symbols)
  return NextResponse.json({ quotes })
}
