import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@portfolio.care'
const DEMO_PASSWORD = 'demo1234'

async function main() {
  // Reset the demo user so the seed is idempotent.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: '데모 투자자', passwordHash },
  })

  const growth = await prisma.portfolio.create({
    data: { userId: user.id, name: '성장주 계좌', baseCurrency: 'USD' },
  })
  const dividend = await prisma.portfolio.create({
    data: { userId: user.id, name: '배당 ETF', baseCurrency: 'USD' },
  })

  const day = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86_400_000)

  await prisma.transaction.createMany({
    data: [
      // Growth portfolio
      { portfolioId: growth.id, symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', side: 'BUY', quantity: 20, price: 165, fee: 1, tradedAt: day(180) },
      { portfolioId: growth.id, symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', side: 'BUY', quantity: 10, price: 182, fee: 1, tradedAt: day(60) },
      { portfolioId: growth.id, symbol: 'MSFT', name: 'Microsoft', assetType: 'STOCK', side: 'BUY', quantity: 8, price: 320, fee: 1, tradedAt: day(150) },
      { portfolioId: growth.id, symbol: 'NVDA', name: 'NVIDIA', assetType: 'STOCK', side: 'BUY', quantity: 15, price: 95, fee: 1, tradedAt: day(120) },
      { portfolioId: growth.id, symbol: 'NVDA', name: 'NVIDIA', assetType: 'STOCK', side: 'SELL', quantity: 5, price: 130, fee: 1, tradedAt: day(30) },
      { portfolioId: growth.id, symbol: 'GOOGL', name: 'Alphabet', assetType: 'STOCK', side: 'BUY', quantity: 12, price: 140, fee: 1, tradedAt: day(90) },
      { portfolioId: growth.id, symbol: 'TSLA', name: 'Tesla', assetType: 'STOCK', side: 'BUY', quantity: 6, price: 240, fee: 1, tradedAt: day(45) },
      // Dividend portfolio
      { portfolioId: dividend.id, symbol: 'SCHD', name: 'Schwab US Dividend', assetType: 'ETF', side: 'BUY', quantity: 50, price: 74, fee: 0, tradedAt: day(200) },
      { portfolioId: dividend.id, symbol: 'VOO', name: 'Vanguard S&P 500', assetType: 'ETF', side: 'BUY', quantity: 10, price: 400, fee: 0, tradedAt: day(160) },
      { portfolioId: dividend.id, symbol: 'VOO', name: 'Vanguard S&P 500', assetType: 'ETF', side: 'BUY', quantity: 5, price: 430, fee: 0, tradedAt: day(20) },
    ],
  })

  // Weekly snapshots so the trend chart has history to render.
  const weeks = 16
  for (let w = weeks; w >= 0; w--) {
    const growthCost = 8000 + (weeks - w) * 120
    const growthValue = growthCost * (1 + 0.05 + Math.sin(w / 3) * 0.04 + (weeks - w) * 0.006)
    const divCost = 9000 + (weeks - w) * 60
    const divValue = divCost * (1 + 0.03 + Math.cos(w / 4) * 0.02 + (weeks - w) * 0.004)
    const takenAt = day(w * 7)
    await prisma.snapshot.create({
      data: { portfolioId: growth.id, totalValue: Math.round(growthValue), totalCost: Math.round(growthCost), takenAt },
    })
    await prisma.snapshot.create({
      data: { portfolioId: dividend.id, totalValue: Math.round(divValue), totalCost: Math.round(divCost), takenAt },
    })
  }

  // ── JACK1 LENS seed: admin, stocks, and one published post ────────────────
  const ADMIN_EMAIL = 'admin@portfolio.care'
  const ADMIN_PASSWORD = 'admin1234'
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } })
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: '애널리스트',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: 'ADMIN',
    },
  })

  const stocks = [
    { ticker: 'AAPL', name: 'Apple Inc.', industry: 'Consumer Electronics', sector: 'Technology' },
    { ticker: 'MSFT', name: 'Microsoft', industry: 'Software', sector: 'Technology' },
    { ticker: 'NVDA', name: 'NVIDIA', industry: 'Semiconductors', sector: 'Technology' },
    { ticker: 'GOOGL', name: 'Alphabet', industry: 'Internet', sector: 'Communication' },
    { ticker: 'TSLA', name: 'Tesla', industry: 'Auto Manufacturers', sector: 'Consumer Cyclical' },
    { ticker: 'SCHD', name: 'Schwab US Dividend', industry: 'ETF', sector: 'ETF' },
    { ticker: 'VOO', name: 'Vanguard S&P 500', industry: 'ETF', sector: 'ETF' },
  ]
  for (const s of stocks) {
    await prisma.stock.upsert({
      where: { ticker: s.ticker },
      update: { name: s.name, industry: s.industry, sector: s.sector },
      create: s,
    })
  }

  // A published post tagged AAPL — the demo subscriber holds AAPL, so this
  // should appear in their feed.
  await prisma.analysisPost.create({
    data: {
      title: '애플 2025Q1 실적, 이번 분기엔 서비스 매출을 보라',
      body: '## 핵심\n애플의 하드웨어 성장은 둔화됐지만, **서비스 부문**이 실적을 떠받치고 있습니다.\n\n- 서비스 매출 성장률과 마진 추이\n- 아이폰 교체 주기\n- 중국 매출 회복 여부\n\n이번 분기는 서비스 매출 비중이 어디까지 오르는지가 관전 포인트예요.',
      lensType: 'earnings',
      status: 'published',
      themeTags: 'AI, 서비스매출',
      authorId: admin.id,
      publishedAt: new Date(),
      stocks: { connect: [{ ticker: 'AAPL' }] },
    },
  })

  console.log(`Seeded subscriber: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`Seeded admin:      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
