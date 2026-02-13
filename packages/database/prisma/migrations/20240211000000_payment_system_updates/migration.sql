-- Add PENDING_APPROVAL to BookingStatus enum
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

-- Add approval fields to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvalDeadline" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "approvalExpired" BOOLEAN NOT NULL DEFAULT false;

-- Add stripeAccountId to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;

-- Create PayoutStatus enum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- Create HostPayout table
CREATE TABLE IF NOT EXISTS "HostPayout" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "hostAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostPayout_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on HostPayout.bookingId
CREATE UNIQUE INDEX IF NOT EXISTS "HostPayout_bookingId_key" ON "HostPayout"("bookingId");

-- Create unique constraint on HostPayout.stripeTransferId
CREATE UNIQUE INDEX IF NOT EXISTS "HostPayout_stripeTransferId_key" ON "HostPayout"("stripeTransferId");

-- Create indexes on HostPayout
CREATE INDEX IF NOT EXISTS "HostPayout_hostId_idx" ON "HostPayout"("hostId");
CREATE INDEX IF NOT EXISTS "HostPayout_status_idx" ON "HostPayout"("status");
CREATE INDEX IF NOT EXISTS "HostPayout_scheduledAt_idx" ON "HostPayout"("scheduledAt");

-- Add foreign keys to HostPayout
ALTER TABLE "HostPayout" ADD CONSTRAINT "HostPayout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HostPayout" ADD CONSTRAINT "HostPayout_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create PaymentAuditLog table
CREATE TABLE IF NOT EXISTS "PaymentAuditLog" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes on PaymentAuditLog
CREATE INDEX IF NOT EXISTS "PaymentAuditLog_paymentId_idx" ON "PaymentAuditLog"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentAuditLog_actorId_idx" ON "PaymentAuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "PaymentAuditLog_action_idx" ON "PaymentAuditLog"("action");
CREATE INDEX IF NOT EXISTS "PaymentAuditLog_createdAt_idx" ON "PaymentAuditLog"("createdAt");

-- Add foreign key to PaymentAuditLog
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PaymentSettings table
CREATE TABLE IF NOT EXISTS "PaymentSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on PaymentSettings.key
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSettings_key_key" ON "PaymentSettings"("key");

-- Create AdminAction table
CREATE TABLE IF NOT EXISTS "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- Create indexes on AdminAction
CREATE INDEX IF NOT EXISTS "AdminAction_adminId_idx" ON "AdminAction"("adminId");
CREATE INDEX IF NOT EXISTS "AdminAction_resource_resourceId_idx" ON "AdminAction"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "AdminAction_action_idx" ON "AdminAction"("action");
CREATE INDEX IF NOT EXISTS "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- Add foreign key to AdminAction
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index on Payment for (bookingId, type, status) - will be used for unique constraint check
CREATE INDEX IF NOT EXISTS "Payment_bookingId_type_status_idx" ON "Payment"("bookingId", "type", "status");

-- Note: Unique partial constraint on Payment (bookingId, type, status) for status=PENDING
-- PostgreSQL doesn't support partial unique constraints directly, so we'll enforce this in application code
-- Alternatively, we can create a unique index with a WHERE clause:
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_bookingId_type_status_pending_unique" 
ON "Payment"("bookingId", "type") 
WHERE "status" = 'PENDING';
