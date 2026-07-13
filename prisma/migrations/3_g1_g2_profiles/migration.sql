-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "industryProfile" TEXT;

-- AlterTable
ALTER TABLE "StockQuarterlyReport" ADD COLUMN     "grossProfit" DOUBLE PRECISION,
ADD COLUMN     "operatingIncome" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "StockAutoIndicator" ADD COLUMN     "grossMarginPct" DOUBLE PRECISION,
ADD COLUMN     "operatingMarginPct" DOUBLE PRECISION,
ADD COLUMN     "g1Suggested" INTEGER,
ADD COLUMN     "g2Suggested" INTEGER;
