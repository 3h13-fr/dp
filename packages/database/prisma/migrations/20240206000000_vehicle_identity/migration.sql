-- Vehicle Identity: enums
CREATE TYPE "FuelType" AS ENUM ('petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'other');
CREATE TYPE "TransmissionType" AS ENUM ('manual', 'automatic', 'semi_automatic', 'cvt', 'other');
CREATE TYPE "DriveType" AS ENUM ('fwd', 'rwd', 'awd', 'other');
CREATE TYPE "ReferenceStatus" AS ENUM ('verified', 'unverified');
CREATE TYPE "SpecSource" AS ENUM ('system', 'host_confirmed', 'host_manual');

-- Make
CREATE TABLE "Make" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalSource" TEXT,
    "externalId" TEXT,
    "status" "ReferenceStatus" NOT NULL DEFAULT 'verified',

    CONSTRAINT "Make_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Make_slug_key" ON "Make"("slug");
CREATE INDEX "Make_slug_idx" ON "Make"("slug");
CREATE INDEX "Make_status_idx" ON "Make"("status");

-- MakeAlias
CREATE TABLE "MakeAlias" (
    "id" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,

    CONSTRAINT "MakeAlias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MakeAlias_makeId_normalizedAlias_key" ON "MakeAlias"("makeId", "normalizedAlias");
CREATE INDEX "MakeAlias_normalizedAlias_idx" ON "MakeAlias"("normalizedAlias");
ALTER TABLE "MakeAlias" ADD CONSTRAINT "MakeAlias_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "Make"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Model
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ReferenceStatus" NOT NULL DEFAULT 'verified',
    "externalSource" TEXT,
    "externalId" TEXT,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Model_makeId_slug_key" ON "Model"("makeId", "slug");
CREATE INDEX "Model_makeId_idx" ON "Model"("makeId");
CREATE INDEX "Model_status_idx" ON "Model"("status");
ALTER TABLE "Model" ADD CONSTRAINT "Model_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "Make"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ModelAlias
CREATE TABLE "ModelAlias" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,

    CONSTRAINT "ModelAlias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModelAlias_modelId_normalizedAlias_key" ON "ModelAlias"("modelId", "normalizedAlias");
CREATE INDEX "ModelAlias_normalizedAlias_idx" ON "ModelAlias"("normalizedAlias");
ALTER TABLE "ModelAlias" ADD CONSTRAINT "ModelAlias_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vehicle
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "trimLabel" TEXT,
    "fuelType" "FuelType",
    "transmissionType" "TransmissionType",
    "driveType" "DriveType",
    "topSpeedKmh" INTEGER,
    "zeroTo100S" DECIMAL(5,2),
    "powerKw" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");
CREATE INDEX "Vehicle_makeId_idx" ON "Vehicle"("makeId");
CREATE INDEX "Vehicle_modelId_idx" ON "Vehicle"("modelId");
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "Make"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- VehicleSpecMeta
CREATE TABLE "VehicleSpecMeta" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "specKey" TEXT NOT NULL,
    "source" "SpecSource" NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSpecMeta_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleSpecMeta_vehicleId_specKey_key" ON "VehicleSpecMeta"("vehicleId", "specKey");
CREATE INDEX "VehicleSpecMeta_vehicleId_idx" ON "VehicleSpecMeta"("vehicleId");
ALTER TABLE "VehicleSpecMeta" ADD CONSTRAINT "VehicleSpecMeta_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VehicleFieldAudit
CREATE TABLE "VehicleFieldAudit" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "source" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleFieldAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehicleFieldAudit_vehicleId_idx" ON "VehicleFieldAudit"("vehicleId");
CREATE INDEX "VehicleFieldAudit_fieldName_idx" ON "VehicleFieldAudit"("fieldName");
CREATE INDEX "VehicleFieldAudit_createdAt_idx" ON "VehicleFieldAudit"("createdAt");
ALTER TABLE "VehicleFieldAudit" ADD CONSTRAINT "VehicleFieldAudit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Listing: add vehicleId, displayName, doors, luggage; make title nullable
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "doors" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "luggage" INTEGER;
ALTER TABLE "Listing" ALTER COLUMN "title" DROP NOT NULL;
CREATE INDEX "Listing_vehicleId_idx" ON "Listing"("vehicleId");
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
