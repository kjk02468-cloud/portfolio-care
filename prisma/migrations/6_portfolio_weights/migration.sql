-- AlterTable: 포트폴리오 비중 규율 필드 (자금줄 · 모델 목표 비중)
ALTER TABLE "Stock" ADD COLUMN "fundingLine" TEXT;
ALTER TABLE "Stock" ADD COLUMN "modelWeight" DOUBLE PRECISION;
