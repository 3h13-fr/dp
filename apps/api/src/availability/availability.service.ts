import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get availability for a listing in a date range (public).
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
   * Set availability for a listing (host only). Upserts by (listingId, date).
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

    let updated = 0;
    for (const item of items) {
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) continue;
      date.setUTCHours(0, 0, 0, 0);

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
      updated += 1;
    }
    return { updated };
  }

  /**
   * Check if every day in [startAt, endAt] is available for the listing.
   * If the listing has no availability rows, returns true (open by default).
   */
  async isRangeAvailable(listingId: string, startAt: Date, endAt: Date): Promise<boolean> {
    const count = await this.prisma.listingAvailability.count({ where: { listingId } });
    if (count === 0) return true;

    const start = new Date(startAt);
    const end = new Date(endAt);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

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
