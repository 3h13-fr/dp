import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { QueueService } from '../queue/queue.service';
import { AvailabilityService } from '../availability/availability.service';
import { BookingStatus } from 'database';
import { Decimal } from 'database';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private queue: QueueService,
    private availability: AvailabilityService,
  ) {}

  async findForGuest(guestId: string, limit = 20, offset = 0): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { guestId },
        include: {
          listing: { select: { id: true, title: true, type: true, photos: { take: 1 } } },
          host: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { startAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.booking.count({ where: { guestId } }),
    ]);
    return { items, total };
  }

  async findForHost(hostId: string, limit = 50, offset = 0): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { hostId },
        include: {
          listing: { select: { id: true, title: true, type: true, photos: { take: 1 } } },
          guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { startAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.booking.count({ where: { hostId } }),
    ]);
    return { items, total };
  }

  async findOne(id: string): Promise<unknown> {
    return this.prisma.booking.findUniqueOrThrow({
      where: { id },
      include: {
        listing: true,
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /** Create a new booking (guest only). Total computed from listing price × days. Rejects on overlap or unavailable dates. */
  async create(
    guestId: string,
    data: { listingId: string; startAt: Date; endAt: Date; options?: Record<string, unknown> },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: data.listingId, status: 'ACTIVE' },
    });
    if (!listing) throw new BadRequestException('Listing not found');

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (startAt >= endAt) throw new BadRequestException('Invalid date range');

    const overlapping = await this.prisma.booking.findFirst({
      where: {
        listingId: data.listingId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (overlapping) throw new BadRequestException('Dates overlap with an existing booking');

    const isAvailable = await this.availability.isRangeAvailable(data.listingId, startAt, endAt);
    if (!isAvailable) throw new BadRequestException('One or more dates are not available for this listing');

    const days = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / (24 * 60 * 60 * 1000)));
    const pricePerDay = listing.pricePerDay?.toNumber() ?? 0;
    const totalAmount = pricePerDay * days;
    const cautionAmount = listing.caution?.toNumber() ?? 0;

    return this.prisma.booking.create({
      data: {
        listingId: data.listingId,
        guestId,
        hostId: listing.hostId,
        status: BookingStatus.PENDING,
        startAt,
        endAt,
        totalAmount: new Decimal(totalAmount),
        currency: listing.currency,
        cautionAmount: cautionAmount ? new Decimal(cautionAmount) : null,
        options: (data.options ?? undefined) as import('database').Prisma.InputJsonValue | undefined,
      },
      include: {
        listing: { select: { id: true, title: true, type: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /** Update booking status and emit to WebSocket room */
  async updateStatus(bookingId: string, status: BookingStatus, actorId: string): Promise<unknown> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId },
    });
    if (!booking) return null;
    if (booking.guestId !== actorId && booking.hostId !== actorId) return null;

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        listing: { select: { id: true, title: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    this.events.emitBookingStatus(bookingId, status, { booking: updated });
    if (status === BookingStatus.CONFIRMED && updated.guest?.email) {
      await this.queue.enqueueBookingConfirmationEmail(
        bookingId,
        updated.guest.email,
        'en',
      );
    }
    return updated;
  }
}
