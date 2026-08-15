ALTER TABLE "Brand"
  ADD COLUMN "prestashopId" INTEGER,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Brand_prestashopId_key" ON "Brand"("prestashopId");
CREATE INDEX "Brand_prestashopId_idx" ON "Brand"("prestashopId");
