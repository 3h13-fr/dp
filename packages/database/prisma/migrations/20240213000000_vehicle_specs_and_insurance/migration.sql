-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('PARTICULAR', 'PROFESSIONAL');

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "powerCv" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "batteryKwh" DECIMAL(5,2);
ALTER TABLE "Vehicle" ADD COLUMN "registrationCountry" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "licensePlate" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "fiscalPower" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "ownerType" "OwnerType";

-- CreateTable
CREATE TABLE "Insurer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Insurer_status_idx" ON "Insurer"("status");

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "insurerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eligibilityCriteria" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InsurancePolicy_insurerId_idx" ON "InsurancePolicy"("insurerId");
CREATE INDEX "InsurancePolicy_status_idx" ON "InsurancePolicy"("status");

-- CreateTable
CREATE TABLE "ListingInsurancePolicy" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "insurancePolicyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingInsurancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingInsurancePolicy_listingId_insurancePolicyId_key" ON "ListingInsurancePolicy"("listingId", "insurancePolicyId");
CREATE INDEX "ListingInsurancePolicy_listingId_idx" ON "ListingInsurancePolicy"("listingId");
CREATE INDEX "ListingInsurancePolicy_insurancePolicyId_idx" ON "ListingInsurancePolicy"("insurancePolicyId");

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInsurancePolicy" ADD CONSTRAINT "ListingInsurancePolicy_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingInsurancePolicy" ADD CONSTRAINT "ListingInsurancePolicy_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "InsurancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
