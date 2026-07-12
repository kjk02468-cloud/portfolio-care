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

  // G값 예시 (매뉴얼 결정트리 데모용): NVDA=4-A(③), AAPL=3단계(⑤),
  // MSFT=2단계(⑥), GOOGL=4-B(④), TSLA=1단계(②), SCHD·VOO=미판정
  const stocks = [
    { ticker: 'AAPL', name: 'Apple Inc.', industry: 'Consumer Electronics', sector: 'Technology', g1: 1, g2: 1, g3s: 2, g4: 1, stageNote: '시드 예시: G3s=2·G4 여유 → 3단계(⑤)' },
    { ticker: 'MSFT', name: 'Microsoft', industry: 'Software', sector: 'Technology', g1: 1, g2: 1, g3s: 1, g4: 1, stageNote: '시드 예시: 모멘텀 미성숙 → 2단계 적립(⑥)' },
    { ticker: 'NVDA', name: 'NVIDIA', industry: 'Semiconductors', sector: 'Technology', g1: 1, g2: 1, g3s: 4, g4: 0, stageNote: '시드 예시: G3s=4 → 4-A ride(③)' },
    { ticker: 'GOOGL', name: 'Alphabet', industry: 'Internet', sector: 'Communication', g1: 1, g2: 1, g3s: 2, g4: 0, stageNote: '시드 예시: 모멘텀+과열 → 4-B 트림(④)' },
    { ticker: 'TSLA', name: 'Tesla', industry: 'Auto Manufacturers', sector: 'Consumer Cyclical', g1: 0, g2: 1, g3s: 0, g4: 1, stageNote: '시드 예시: G1 미통과 → 1단계 관망(②)' },
    { ticker: 'SCHD', name: 'Schwab US Dividend', industry: 'ETF', sector: 'ETF' },
    { ticker: 'VOO', name: 'Vanguard S&P 500', industry: 'ETF', sector: 'ETF' },
  ] as const
  for (const s of stocks) {
    const stageFields =
      'g1' in s
        ? { g1: s.g1, g2: s.g2, g3s: s.g3s, g4: s.g4, stageNote: s.stageNote, stageUpdatedAt: new Date() }
        : {}
    await prisma.stock.upsert({
      where: { ticker: s.ticker },
      update: { name: s.name, industry: s.industry, sector: s.sector, ...stageFields },
      create: { ticker: s.ticker, name: s.name, industry: s.industry, sector: s.sector, ...stageFields },
    })
  }

  // A published post tagged AAPL — the demo subscriber holds AAPL, so this
  // should appear in their feed.
  const earningsPost = await prisma.analysisPost.create({
    data: {
      title: '애플 이번 분기 실적, 서비스 매출을 보라',
      body: '## 핵심\n애플의 하드웨어 성장은 둔화됐지만, **서비스 부문**이 실적을 떠받치고 있습니다.\n\n- 서비스 매출 성장률과 마진 추이\n- 아이폰 교체 주기\n- 중국 매출 회복 여부\n\n이번 분기는 서비스 매출 비중이 어디까지 오르는지가 관전 포인트예요.\n\n> 시드 예시 글입니다. 실제 수치는 관리자가 입력합니다.',
      lensType: 'earnings',
      status: 'published',
      themeTags: 'AI, 서비스매출',
      lensFields: JSON.stringify({
        quarter: '2026 회계연도 3분기 (예시)',
        surprise: 'beat',
        keyMetrics: [
          { key: '서비스 매출', value: '전년比 두 자릿수 성장 (예시)' },
          { key: '총마진', value: '46% 내외 (예시)' },
        ],
      }),
      authorId: admin.id,
      publishedAt: new Date(),
      stocks: { connect: [{ ticker: 'AAPL' }] },
    },
  })

  // Valuechain example — makes "어느 산업 / 어느 단계가 병목" explicit.
  await prisma.analysisPost.create({
    data: {
      title: 'AI 반도체 밸류체인, 어디가 병목인가',
      body: '## 병목\nAI 가속기 수요가 폭발하면서 밸류체인 상의 특정 단계에 병목이 생기고 있습니다.\nNVDA의 출하량은 결국 이 병목 단계의 캐파에 좌우됩니다.\n\n> 시드 예시 글입니다.',
      lensType: 'valuechain',
      status: 'published',
      themeTags: 'HBM, AI, 반도체',
      lensFields: JSON.stringify({
        industry: 'AI 반도체',
        chainSteps: ['설계(NVDA)', '파운드리(TSMC)', 'HBM(메모리)', 'CoWoS 패키징'],
        bottleneckStep: 'CoWoS 패키징',
        capitalConcentration:
          '선단 패키징 캐파에 투자가 집중되고 있으며, 증설 리드타임이 길어 단기 병목이 지속될 전망 (예시).',
      }),
      authorId: admin.id,
      publishedAt: new Date(),
      stocks: { connect: [{ ticker: 'NVDA' }] },
      // Cross-lens linkage: relate to the earnings post.
      relatedTo: { connect: [{ id: earningsPost.id }] },
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
