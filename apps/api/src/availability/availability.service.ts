import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus } from 'database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get availability for a listing in a date range (public).
   * When the listing has vehicleId, returns vehicle-level availability (shared across all listings for that vehicle).
   * Otherwise returns listing-level availability.
   * Returns one row per day: { date (ISO date string), available, priceOverride }.
   */
  async getForListing(
    listingId: string,
    from: Date,
    to: Date,
  ): Promise<{ date: string; available: boolean; priceOverride: number | null }[]> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const start = new Date(from);
    const end = new Date(to);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    if (start > end) throw new BadRequestException('Invalid date range');

    if (listing.vehicleId) {
      const rows = await this.prisma.vehicleAvailability.findMany({
        where: {
          vehicleId: listing.vehicleId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'asc' },
      });
      return rows.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        available: r.available,
        priceOverride: r.priceOverride?.toNumber() ?? null,
      }));
    }

    const rows = await this.prisma.listingAvailability.findMany({
      where: {
        listingId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      available: r.available,
      priceOverride: r.priceOverride?.toNumber() ?? null,
    }));
  }

  /**
   * Set availability for a listing (host only).
   * When the listing has vehicleId, upserts vehicle-level availability (shared across all listings for that vehicle).
   * Otherwise upserts by (listingId, date).
   */
  async setForListing(
    listingId: string,
    hostId: string,
    items: { date: string; available: boolean; priceOverride?: number }[],
  ): Promise<{ updated: number }> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not the host of this listing');

    if (!items?.length) return { updated: 0 };

    const targetVehicleId = listing.vehicleId ?? null;

    let updated = 0;
    for (const item of items) {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) continue;
      date.setUTCHours(0, 0, 0, 0);

      if (targetVehicleId) {
        await this.prisma.vehicleAvailability.upsert({
          where: {
            vehicleId_date: { vehicleId: targetVehicleId, date },
          },
          create: {
            vehicleId: targetVehicleId,
            date,
            available: item.available,
            priceOverride: item.priceOverride != null ? item.priceOverride : undefined,
          },
          update: {
            available: item.available,
            priceOverride: item.priceOverride != null ? item.priceOverride : null,
          },
        });
      } else {
        await this.prisma.listingAvailability.upsert({
          where: {
            listingId_date: { listingId, date },
          },
          create: {
            listingId,
            date,
            available: item.available,
            priceOverride: item.priceOverride != null ? item.priceOverride : undefined,
          },
          update: {
            available: item.available,
            priceOverride: item.priceOverride != null ? item.priceOverride : null,
          },
        });
      }
      updated += 1;
    }
    return { updated };
  }

  /**
   * Check if every day in [startAt, endAt] is available for the listing.
   * When the listing has vehicleId: checks vehicle-level availability and that no booking for any listing
   * of that vehicle overlaps (one calendar per vehicle).
   * Otherwise: listing-level availability and no overlap for this listing only.
   * If there are no availability rows for the scope, returns true (open by default).
   */
  async isRangeAvailable(listingId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId }, select: { vehicleId: true } });
    if (!listing) return false;

    const start = new Date(startAt);
    const end = new Date(endAt);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (listing.vehicleId) {
      const vehicleCount = await this.prisma.vehicleAvailability.count({ where: { vehicleId: listing.vehicleId } });
      if (vehicleCount > 0) {
        const unavailable = await this.prisma.vehicleAvailability.findFirst({
          where: {
            vehicleId: listing.vehicleId,
            date: { gte: start, lte: end },
            available: false,
          },
        });
        if (unavailable) return false;
      }
      const overlappingBooking = await this.prisma.booking.findFirst({
        where: {
          listing: { vehicleId: listing.vehicleId },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
          startAt: { lt: end },
          endAt: { gt: start },
        },
      });
      return !overlappingBooking;
    }

    const count = await this.prisma.listingAvailability.count({ where: { listingId } });
    if (count === 0) return true;

    const unavailable = await this.prisma.listingAvailability.findFirst({
      where: {
        listingId,
        date: { gte: start, lte: end },
        available: false,
      },
    });
    return !unavailable;
  }
}
