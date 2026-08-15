-- RC4.0.4 - Prestashop product synchronization metadata and secondary categories.
ALTER TABLE "Product"
  ADD COLUMN "descriptionShort" TEXT,
  ADD COLUMN "metaTitle" TEXT,
  ADD COLUMN "metaDescription" TEXT,
  ADD COLUMN "metaKeywords" TEXT,
  ADD COLUMN "prestashopCreatedAt" TIMESTAMP(3),
  ADD COLUMN "prestashopUpdatedAt" TIMESTAMP(3);

CREATE TABLE "ProductCategory" (
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId")
);

CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

ALTER TABLE "ProductCategory"
  ADD CONSTRAINT "ProductCategory_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCategory"
  ADD CONSTRAINT "ProductCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
