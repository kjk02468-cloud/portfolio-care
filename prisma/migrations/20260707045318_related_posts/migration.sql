-- CreateTable
CREATE TABLE "_PostRelations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PostRelations_A_fkey" FOREIGN KEY ("A") REFERENCES "AnalysisPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PostRelations_B_fkey" FOREIGN KEY ("B") REFERENCES "AnalysisPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_PostRelations_AB_unique" ON "_PostRelations"("A", "B");

-- CreateIndex
CREATE INDEX "_PostRelations_B_index" ON "_PostRelations"("B");
