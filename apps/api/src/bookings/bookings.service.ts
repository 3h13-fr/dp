import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { QueueService } from '../queue/queue.service';
import { AvailabilityService } from '../availability/availability.service';
import { PaymentsService } from '../payments/payments.service';
import { BookingStatus } from 'database';
import { Decimal } from 'database';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private queue: QueueService,
    private availability: AvailabilityService,
    private payments: PaymentsService,
  ) {}

  async findForGuest(guestId: string, limit = 20, offset = 0): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { guestId },
        include: {
          listing: { select: { id: true, slug: true, title: true, type: true, photos: { take: 1 } } },
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
          listing: { select: { id: true, slug: true, title: true, type: true, photos: { take: 1 } } },
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
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        listing: { include: { photos: { orderBy: { order: 'asc' } } } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
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

    return this.prisma.$transaction(async (tx) =>
      tx.booking.create({
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
      }),
    );
  }

  /** Update booking status and emit to WebSocket room. Throws NotFoundException if booking missing or not guest/host. */
  async updateStatus(bookingId: string, status: BookingStatus, actorId: string): Promise<unknown> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== actorId && booking.hostId !== actorId) throw new NotFoundException('Booking not found');

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

    if (status === BookingStatus.CANCELLED) {
      const bookingPayment = await this.prisma.payment.findFirst({
        where: { bookingId, type: 'booking', status: 'SUCCEEDED' },
      });
      if (bookingPayment?.id) {
        try {
          await this.payments.refund(bookingPayment.id);
        } catch {
          // Booking already set to CANCELLED; log refund failure
        }
      }
      const guestEmail = updated.guest?.email;
      if (guestEmail) {
        const locale = (updated.guest as { preferredLang?: string })?.preferredLang ?? 'en';
        await this.queue.enqueueBookingCancelledEmail(bookingId, guestEmail, locale);
      }
    }

    return updated;
  }

  /** Report an issue / dispute for a booking (guest or host). Logged in audit for admin. */
  async reportIssue(bookingId: string, userId: string, message: string): Promise<{ received: boolean }> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId },
      include: { guest: { select: { email: true } }, host: { select: { email: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== userId && booking.hostId !== userId) throw new NotFoundException('Booking not found');

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'report_issue',
        resource: 'Booking',
        resourceId: bookingId,
        metadata: { message, guestId: booking.guestId, hostId: booking.hostId } as object,
      },
    });
    return { received: true };
  }
}
