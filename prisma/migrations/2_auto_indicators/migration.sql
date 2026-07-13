-- CreateTable
CREATE TABLE "StockPriceBar" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StockPriceBar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockQuarterlyReport" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3),
    "revenue" DOUBLE PRECISION,
    "epsActual" DOUBLE PRECISION,
    "epsEstimate" DOUBLE PRECISION,
    "revenueEstimate" DOUBLE PRECISION,
    "source" TEXT NOT NULL,

    CONSTRAINT "StockQuarterlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAutoIndicator" (
    "stockId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION,
    "high52w" DOUBLE PRECISION,
    "drawdownPct" DOUBLE PRECISION,
    "ma50" DOUBLE PRECISION,
    "ma200" DOUBLE PRECISION,
    "atr14" DOUBLE PRECISION,
    "volAvgRatio" DOUBLE PRECISION,
    "g4Suggested" INTEGER,
    "revenueYoY" DOUBLE PRECISION,
    "revenueYoYPrev" DOUBLE PRECISION,
    "epsSurprisePct" DOUBLE PRECISION,
    "revenueSurprisePct" DOUBLE PRECISION,
    "g3Suggested" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "StockAutoIndicator_pkey" PRIMARY KEY ("stockId")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockPriceBar_stockId_date_key" ON "StockPriceBar"("stockId", "date");

-- CreateIndex
CREATE INDEX "StockPriceBar_stockId_date_idx" ON "StockPriceBar"("stockId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StockQuarterlyReport_stockId_periodEnd_key" ON "StockQuarterlyReport"("stockId", "periodEnd");

-- CreateIndex
CREATE INDEX "StockQuarterlyReport_stockId_periodEnd_idx" ON "StockQuarterlyReport"("stockId", "periodEnd");

-- AddForeignKey
ALTER TABLE "StockPriceBar" ADD CONSTRAINT "StockPriceBar_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockQuarterlyReport" ADD CONSTRAINT "StockQuarterlyReport_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAutoIndicator" ADD CONSTRAINT "StockAutoIndicator_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
