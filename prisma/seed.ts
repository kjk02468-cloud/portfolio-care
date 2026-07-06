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

  console.log(`Seeded demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
