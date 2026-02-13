-- CreateTable: ListingCategory (many-to-many)
CREATE TABLE "ListingCategory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingCategory_pkey" PRIMARY KEY ("id")
);

-- Migrate existing categoryId data to ListingCategory
INSERT INTO "ListingCategory" ("id", "listingId", "categoryId", "createdAt")
SELECT 
    gen_random_uuid()::text as "id",
    "id" as "listingId",
    "categoryId" as "categoryId",
    CURRENT_TIMESTAMP as "createdAt"
FROM "Listing"
WHERE "categoryId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ListingCategory_listingId_categoryId_key" ON "ListingCategory"("listingId", "categoryId");

-- CreateIndex
CREATE INDEX "ListingCategory_listingId_idx" ON "ListingCategory"("listingId");

-- CreateIndex
CREATE INDEX "ListingCategory_categoryId_idx" ON "ListingCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "ListingCategory" ADD CONSTRAINT "ListingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCategory" ADD CONSTRAINT "ListingCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey (if exists)
ALTER TABLE "Listing" DROP CONSTRAINT IF EXISTS "Listing_categoryId_fkey";

-- DropIndex (if exists)
DROP INDEX IF EXISTS "Listing_categoryId_idx";

-- DropColumn
ALTER TABLE "Listing" DROP COLUMN IF EXISTS "categoryId";
