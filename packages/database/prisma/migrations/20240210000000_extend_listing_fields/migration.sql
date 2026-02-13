-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "minBookingNoticeHours" INTEGER,
ADD COLUMN     "maxBookingAdvanceDays" INTEGER,
ADD COLUMN     "instantBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minRentalDurationHours" INTEGER,
ADD COLUMN     "maxRentalDurationDays" INTEGER,
ADD COLUMN     "autoAcceptBookings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minDriverAge" INTEGER,
ADD COLUMN     "minLicenseYears" INTEGER;
