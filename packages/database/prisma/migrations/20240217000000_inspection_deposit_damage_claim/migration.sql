-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('DEPART', 'RETOUR');

CREATE TYPE "InspectionMode" AS ENUM ('MAIN_PROPRE', 'BOITE_A_CLES');

CREATE TYPE "InspectionCreator" AS ENUM ('HOST', 'RENTER');

CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VALIDATED', 'CONTESTED', 'EXPIRED');

CREATE TYPE "ConditionStatus" AS ENUM ('OK', 'MINOR_ISSUE', 'MAJOR_ISSUE');

CREATE TYPE "CleanlinessLevel" AS ENUM ('CLEAN', 'LIGHT_DIRT', 'DIRTY', 'VERY_DIRTY');

CREATE TYPE "DamageClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'AWAITING_RENTER_RESPONSE', 'RENTER_ACCEPTED', 'RENTER_CONTESTED', 'AWAITING_ADMIN_REVIEW', 'ADMIN_APPROVED', 'ADMIN_ADJUSTED', 'ADMIN_REJECTED', 'CLOSED');

CREATE TYPE "DepositStatus" AS ENUM ('PREAUTHORIZED', 'HELD', 'UNDER_REVIEW', 'RELEASED', 'CAPTURE_REQUESTED', 'CAPTURED_PARTIAL', 'CAPTURED_FULL');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "handoverMode" "InspectionMode";

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "mode" "InspectionMode" NOT NULL,
    "createdBy" "InspectionCreator" NOT NULL,
    "delegated" BOOLEAN NOT NULL DEFAULT false,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "mileageValue" INTEGER,
    "energyLevelPercent" INTEGER,
    "documentsPresent" JSONB,
    "accessoriesChecklist" JSONB,
    "dashboardWarnings" JSONB,
    "metadata" JSONB,
    "contentHash" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "photoStepCode" TEXT NOT NULL,
    "photoUrl" TEXT,
    "conditionStatus" "ConditionStatus" NOT NULL,
    "conditionNote" TEXT,
    "cleanlinessLevel" "CleanlinessLevel" NOT NULL,
    "cleanlinessNote" TEXT,
    "detailCloseups" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageClaim" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "DamageClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "zoneCoords" JSONB,
    "amountRequested" DECIMAL(10,2) NOT NULL,
    "justification" TEXT NOT NULL,
    "quoteUrl" TEXT,
    "departPhotoUrl" TEXT NOT NULL,
    "returnPhotoUrl" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "renterResponse" TEXT,
    "renterResponseAt" TIMESTAMP(3),
    "adminDecision" TEXT,
    "adminAmount" DECIMAL(10,2),
    "adminNote" TEXT,
    "adminDecidedAt" TIMESTAMP(3),
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PREAUTHORIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTimelineEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionScoring" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "inspectionId" TEXT,
    "damageClaimId" TEXT,
    "inspectionQualityScore" INTEGER,
    "hostReliabilityScore" INTEGER,
    "renterReliabilityScore" INTEGER,
    "claimConfidenceScore" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionScoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectionItem_inspectionId_itemCode_key" ON "InspectionItem"("inspectionId", "itemCode");

-- CreateIndex
CREATE INDEX "Inspection_bookingId_idx" ON "Inspection"("bookingId");

-- CreateIndex
CREATE INDEX "Inspection_bookingId_type_idx" ON "Inspection"("bookingId", "type");

-- CreateIndex
CREATE INDEX "InspectionItem_inspectionId_idx" ON "InspectionItem"("inspectionId");

-- CreateIndex
CREATE INDEX "DamageClaim_bookingId_idx" ON "DamageClaim"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_bookingId_key" ON "Deposit"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_paymentId_key" ON "Deposit"("paymentId");

-- CreateIndex
CREATE INDEX "InspectionTimelineEvent_bookingId_idx" ON "InspectionTimelineEvent"("bookingId");

-- CreateIndex
CREATE INDEX "InspectionTimelineEvent_bookingId_eventType_idx" ON "InspectionTimelineEvent"("bookingId", "eventType");

-- CreateIndex
CREATE INDEX "InspectionScoring_bookingId_idx" ON "InspectionScoring"("bookingId");

-- CreateIndex
CREATE INDEX "InspectionScoring_inspectionId_idx" ON "InspectionScoring"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionScoring_damageClaimId_idx" ON "InspectionScoring"("damageClaimId");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageClaim" ADD CONSTRAINT "DamageClaim_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTimelineEvent" ADD CONSTRAINT "InspectionTimelineEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
