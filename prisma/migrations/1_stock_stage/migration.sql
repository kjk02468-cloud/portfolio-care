-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "g1" INTEGER,
ADD COLUMN     "g2" INTEGER,
ADD COLUMN     "g3s" INTEGER,
ADD COLUMN     "g4" INTEGER,
ADD COLUMN     "kill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stageNote" TEXT,
ADD COLUMN     "stageUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AnalysisPost" ADD COLUMN     "stageUpdates" TEXT;

