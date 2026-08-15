ALTER TABLE "Category"
  ADD COLUMN "prestashopId" INTEGER,
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Category_prestashopId_key" ON "Category"("prestashopId");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
