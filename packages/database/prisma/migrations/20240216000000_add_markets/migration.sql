-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "MarketStatus" NOT NULL DEFAULT 'DRAFT',
    "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "bookingsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "defaultCurrency" TEXT,
    "defaultLanguage" TEXT,
    "allowedLanguages" JSONB NOT NULL,
    "allowedCurrencies" JSONB NOT NULL,
    "paymentProvider" TEXT,
    "paymentMethods" JSONB,
    "commissionPercent" DECIMAL(5,2),
    "taxesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "defaultVatRate" DECIMAL(5,2),
    "invoiceLegalMention" TEXT,
    "seoIndexable" BOOLEAN NOT NULL DEFAULT true,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketInsurancePolicy" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "insurancePolicyId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_countryCode_key" ON "Market"("countryCode");

-- CreateIndex
CREATE INDEX "Market_status_idx" ON "Market"("status");

-- CreateIndex
CREATE INDEX "Market_countryCode_idx" ON "Market"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "MarketInsurancePolicy_marketId_insurancePolicyId_key" ON "MarketInsurancePolicy"("marketId", "insurancePolicyId");

-- CreateIndex
CREATE INDEX "MarketInsurancePolicy_marketId_idx" ON "MarketInsurancePolicy"("marketId");

-- CreateIndex
CREATE INDEX "MarketInsurancePolicy_insurancePolicyId_idx" ON "MarketInsurancePolicy"("insurancePolicyId");

-- AddForeignKey
ALTER TABLE "MarketInsurancePolicy" ADD CONSTRAINT "MarketInsurancePolicy_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketInsurancePolicy" ADD CONSTRAINT "MarketInsurancePolicy_insurancePolicyId_fkey" FOREIGN KEY ("insurancePolicyId") REFERENCES "InsurancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
