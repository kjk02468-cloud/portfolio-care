-- AlterTable: 밸류에이션 자동화 필드 (EV/Sales · P/E · 5년 중앙값 대비)
ALTER TABLE "StockAutoIndicator" ADD COLUMN "evToSales" DOUBLE PRECISION;
ALTER TABLE "StockAutoIndicator" ADD COLUMN "pe" DOUBLE PRECISION;
ALTER TABLE "StockAutoIndicator" ADD COLUMN "evToSalesMedian5y" DOUBLE PRECISION;
ALTER TABLE "StockAutoIndicator" ADD COLUMN "peMedian5y" DOUBLE PRECISION;
ALTER TABLE "StockAutoIndicator" ADD COLUMN "valuationPreProfit" BOOLEAN;
ALTER TABLE "StockAutoIndicator" ADD COLUMN "evToSalesVsMedianPct" DOUBLE PRECISION;
ALTER TABLE "StockAutoIndicator" ADD COLUMN "peVsMedianPct" DOUBLE PRECISION;
