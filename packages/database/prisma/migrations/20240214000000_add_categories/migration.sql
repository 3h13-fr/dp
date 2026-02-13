-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vertical" "ListingType" NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_vertical_slug_key" ON "Category"("vertical", "slug");

-- CreateIndex
CREATE INDEX "Category_vertical_idx" ON "Category"("vertical");

-- Drop the old category column if it exists (legacy string field)
ALTER TABLE "Listing" DROP COLUMN IF EXISTS "category";

-- AddForeignKey
ALTER TABLE "Listing" ADD COLUMN "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Listing_categoryId_idx" ON "Listing"("categoryId");
