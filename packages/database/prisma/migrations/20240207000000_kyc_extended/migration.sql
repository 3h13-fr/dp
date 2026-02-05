-- AlterTable
ALTER TABLE "KycVerification" ADD COLUMN "firstName" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "lastName" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "dateOfBirth" DATE;
ALTER TABLE "KycVerification" ADD COLUMN "nationality" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "documentType" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "idDocBackUrl" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "reviewReason" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "ocrPayload" JSONB;
ALTER TABLE "KycVerification" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "KycVerification" ADD COLUMN "rejectionReason" TEXT;
