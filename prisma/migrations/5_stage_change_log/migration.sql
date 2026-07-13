-- CreateTable
CREATE TABLE "StageChangeLog" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "fromStage" TEXT NOT NULL,
    "toStage" TEXT NOT NULL,
    "directCause" TEXT NOT NULL,
    "unchanged" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageChangeLog_stockId_createdAt_idx" ON "StageChangeLog"("stockId", "createdAt");

-- CreateIndex
CREATE INDEX "StageChangeLog_createdAt_idx" ON "StageChangeLog"("createdAt");

-- AddForeignKey
ALTER TABLE "StageChangeLog" ADD CONSTRAINT "StageChangeLog_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
