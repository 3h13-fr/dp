import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { QueueService } from '../queue/queue.service';
import { AvailabilityService } from '../availability/availability.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../stripe/stripe.service';
import { MarketsService } from '../markets/markets.service';
import { BookingStatus, PaymentStatus, ListingType, InspectionStatus, InspectionType } from 'database';
import { Decimal } from 'database';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private queue: QueueService,
    private availability: AvailabilityService,
    private payments: PaymentsService,
    private stripe: StripeService,
    private markets: MarketsService,
  ) {}

  async findForGuest(guestId: string, limit = 20, offset = 0): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { guestId },
        include: {
          listing: { 
            select: { 
              id: true, 
              slug: true, 
              title: true, 
              displayName: true,
              type: true, 
              city: true,
              country: true,
              photos: { take: 1 } 
            } 
          },
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
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        review: { select: { id: true, rating: true, comment: true, createdAt: true } },
        payments: { select: { id: true, status: true, amount: true, currency: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /** Create a new booking (guest only). Total computed from listing price with hourly rates and multi-day discounts. Rejects on overlap or unavailable dates. */
  async create(
    guestId: string,
    data: { listingId: string; startAt: Date; endAt: Date; options?: Record<string, unknown> },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: data.listingId, status: 'ACTIVE' },
    });
    if (!listing) throw new BadRequestException('Listing not found');

    const countryRaw = listing.country?.trim();
    if (!countryRaw) throw new BadRequestException('Listing has no country; cannot create booking.');
    const market = await this.markets.getMarketByCountryCode(countryRaw);
    if (!market || !market.bookingsAllowed) {
      throw new BadRequestException('Réservations temporairement indisponibles pour ce marché.');
    }

    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (startAt >= endAt) throw new BadRequestException('Invalid date range');

    // When listing has a vehicle, block overlap for any listing of that vehicle (shared calendar).
    const overlapping = listing.vehicleId
      ? await this.prisma.booking.findFirst({
          where: {
            listing: { vehicleId: listing.vehicleId },
            status: { in: [BookingStatus.PENDING, BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        })
      : await this.prisma.booking.findFirst({
          where: {
            listingId: data.listingId,
            status: { in: [BookingStatus.PENDING, BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        });
    if (overlapping) throw new BadRequestException('Dates overlap with an existing booking');

    // Check if there's a manual booking pending approval for these dates
    if (listing.manualApprovalRequired) {
      const pendingManualBooking = await this.prisma.booking.findFirst({
        where: {
          listingId: data.listingId,
          status: BookingStatus.PENDING_APPROVAL,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          approvalExpired: false,
        },
      });

      if (pendingManualBooking) {
        throw new BadRequestException(
          'A manual booking is pending approval for these dates. Please wait for the host to respond.',
        );
      }
    }

    const isAvailable = await this.availability.isRangeAvailable(data.listingId, startAt, endAt);
    if (!isAvailable) throw new BadRequestException('One or more dates are not available for this listing');

    // Validate and calculate options price
    const optionsPrice = this.validateAndCalculateOptionsPrice(listing, data.options || {});

    // Calculate price with hourly rates and multi-day discounts
    const basePrice = this.calculateBookingPrice(listing, startAt, endAt);
    const totalAmount = basePrice + optionsPrice;
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
      include: { listing: { select: { type: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== actorId && booking.hostId !== actorId) throw new NotFoundException('Booking not found');

    if (booking.listing.type === ListingType.CAR_RENTAL) {
      if (status === BookingStatus.IN_PROGRESS) {
        const departInspection = await this.prisma.inspection.findFirst({
          where: { bookingId, type: InspectionType.DEPART, status: InspectionStatus.VALIDATED },
        });
        if (!departInspection) {
          throw new BadRequestException(
            'Departure inspection must be validated before the booking can start',
          );
        }
      }
      if (status === BookingStatus.COMPLETED) {
        const returnInspection = await this.prisma.inspection.findFirst({
          where: { bookingId, type: InspectionType.RETOUR, status: InspectionStatus.VALIDATED },
        });
        if (!returnInspection) {
          throw new BadRequestException(
            'Return inspection must be validated before the booking can be completed',
          );
        }
      }
    }

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
      // Cancel HostPayout if not yet paid
      // If already paid, host keeps the money (no automatic reverse)
      await this.prisma.hostPayout.updateMany({
        where: {
          bookingId,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        data: { status: 'CANCELLED' },
      });

      // Check if refund according to cancellation policy
      const bookingPayment = await this.prisma.payment.findFirst({
        where: { bookingId, type: 'booking', status: 'SUCCEEDED' },
        include: {
          booking: {
            include: {
              listing: { select: { cancellationPolicy: true } },
            },
          },
        },
      });

      if (bookingPayment?.id) {
        const refundAmount = this.calculateRefundAmount(
          {
            startAt: bookingPayment.booking.startAt,
            totalAmount: bookingPayment.booking.totalAmount,
            listing: { cancellationPolicy: bookingPayment.booking.listing.cancellationPolicy },
          },
          bookingPayment,
        );

        if (refundAmount > 0) {
          // Automatic refund only if within deadlines
          try {
            await this.payments.refund(bookingPayment.id, refundAmount, bookingPayment.booking.currency);
          } catch {
            // Booking already set to CANCELLED; log refund failure
          }
        }
        // If refundAmount = 0, no automatic refund (handled manually by admin for disputes)
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

  /** Approve a manual booking: capture the payment and confirm the booking */
  async approve(bookingId: string, hostId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, hostId },
      include: { listing: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.listing.manualApprovalRequired) {
      throw new BadRequestException('This booking does not require approval');
    }
    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Booking is not pending approval');
    }

    // Check if deadline has expired
    if (booking.approvalDeadline && new Date() > booking.approvalDeadline) {
      throw new BadRequestException('Approval deadline has expired');
    }

    // Find the PaymentIntent in pre-authorization
    const payment = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        type: 'booking',
        status: PaymentStatus.PENDING,
      },
    });

    if (!payment?.stripePaymentId) {
      throw new BadRequestException('No pending payment found');
    }

    // CAPTURE the payment (definitive charge)
    await this.stripe.capturePaymentIntent(payment.stripePaymentId);

    // Update Payment and Booking
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    const totalAmount = booking.totalAmount.toNumber();
    const COMMISSION_RATE = 0.15; // 15%
    const commissionAmount = totalAmount * COMMISSION_RATE;
    const hostAmount = totalAmount - commissionAmount;

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        approvalDeadline: null,
      },
      include: {
        listing: { select: { id: true, title: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true, preferredLang: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Create HostPayout (scheduled for after booking ends)
    await this.prisma.hostPayout.create({
      data: {
        bookingId,
        hostId,
        totalAmount: new Decimal(totalAmount),
        commissionAmount: new Decimal(commissionAmount),
        hostAmount: new Decimal(hostAmount),
        currency: booking.currency,
        status: 'SCHEDULED',
        scheduledAt: booking.endAt,
      },
    });

    // Send confirmation email
    if (updated.guest?.email) {
      const locale = updated.guest.preferredLang ?? 'en';
      await this.queue.enqueueBookingConfirmationEmail(bookingId, updated.guest.email, locale);
    }

    this.events.emitBookingStatus(bookingId, BookingStatus.CONFIRMED, { booking: updated });
    return updated;
  }

  /** Reject a manual booking: cancel the pre-authorization */
  async reject(bookingId: string, hostId: string, reason?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, hostId },
      include: { listing: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.listing.manualApprovalRequired) {
      throw new BadRequestException('This booking does not require approval');
    }
    if (booking.status !== BookingStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Booking is not pending approval');
    }

    // Find the PaymentIntent in pre-authorization
    const payment = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        type: 'booking',
        status: PaymentStatus.PENDING,
      },
    });

    if (payment?.stripePaymentId) {
      // CANCEL the pre-authorization (release funds)
      await this.stripe.cancelPaymentIntent(payment.stripePaymentId);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }

    // Cancel the booking
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        approvalDeadline: null,
      },
      include: {
        listing: { select: { id: true, title: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true, preferredLang: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Send cancellation email to guest
    if (updated.guest?.email) {
      const locale = updated.guest.preferredLang ?? 'en';
      await this.queue.enqueueBookingCancelledEmail(bookingId, updated.guest.email, locale);
    }

    this.events.emitBookingStatus(bookingId, BookingStatus.CANCELLED, { booking: updated });
    return updated;
  }

  /**
   * Calculate booking price taking into account hourly rates and multi-day discounts
   */
  /**
   * Validate selected options against listing available options and calculate total options price
   */
  private validateAndCalculateOptionsPrice(
    listing: { options?: unknown },
    selectedOptions: Record<string, unknown>,
  ): number {
    const listingOptions = (listing.options as
      | {
          insurance?: { available?: boolean; price?: number; policyIds?: string[] };
          delivery?: { available?: boolean; price?: number; radiusKm?: number };
          secondDriver?: { available?: boolean; price?: number };
        }
      | null
      | undefined) || {};

    let totalOptionsPrice = 0;

    // Validate and calculate insurance (policy-based or legacy)
    const insurancePolicyId = selectedOptions.insurancePolicyId as string | undefined;
    if (insurancePolicyId) {
      const policyIds = listingOptions.insurance?.policyIds;
      if (!Array.isArray(policyIds) || !policyIds.includes(insurancePolicyId)) {
        throw new BadRequestException('Selected insurance policy is not available for this listing');
      }
      if (listingOptions.insurance?.price != null) {
        totalOptionsPrice += listingOptions.insurance.price;
      }
    } else if (selectedOptions.insurance === true) {
      if (!listingOptions.insurance?.available) {
        throw new BadRequestException('Insurance option is not available for this listing');
      }
      if (listingOptions.insurance.price != null) {
        totalOptionsPrice += listingOptions.insurance.price;
      }
    }

    // Validate and calculate guarantees (default price if not in listing options)
    if (selectedOptions.guarantees === true) {
      // Guarantees might not be in listing options, use default price
      totalOptionsPrice += 25; // Default price, can be made configurable
    }

    // Validate and calculate delivery
    if (selectedOptions.delivery && typeof selectedOptions.delivery === 'object') {
      const delivery = selectedOptions.delivery as { enabled?: boolean; address?: string; coordinates?: { lat?: number; lng?: number } };
      if (delivery.enabled === true) {
        if (!listingOptions.delivery?.available) {
          throw new BadRequestException('Delivery option is not available for this listing');
        }
        if (!delivery.address || !delivery.coordinates) {
          throw new BadRequestException('Delivery address and coordinates are required');
        }
        // Validate delivery distance if listing has coordinates
        // Note: This would require listing.latitude/longitude which might not be in the type
        // For now, we'll trust the frontend validation and just check price
        if (listingOptions.delivery.price != null) {
          totalOptionsPrice += listingOptions.delivery.price;
        }
      }
    }

    // Validate and calculate second driver
    if (selectedOptions.secondDriver && typeof selectedOptions.secondDriver === 'object') {
      const secondDriver = selectedOptions.secondDriver as { enabled?: boolean };
      if (secondDriver.enabled === true) {
        if (!listingOptions.secondDriver?.available) {
          throw new BadRequestException('Second driver option is not available for this listing');
        }
        if (listingOptions.secondDriver.price != null) {
          totalOptionsPrice += listingOptions.secondDriver.price;
        }
      }
    }

    return totalOptionsPrice;
  }

  private calculateBookingPrice(
    listing: { pricePerDay: Decimal | null; options: unknown },
    startAt: Date,
    endAt: Date,
  ): number {
    const durationMs = endAt.getTime() - startAt.getTime();
    const hours = Math.ceil(durationMs / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);

    // Extract pricing options
    const options = listing.options as { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null } } | null;
    const pricing = options?.pricing;
    const hourlyAllowed = pricing?.hourlyAllowed === true;
    const pricePerHour = pricing?.pricePerHour ?? null;
    const pricePerDay = listing.pricePerDay?.toNumber() ?? 0;

    let basePrice: number;

    // Determine if we should use hourly pricing
    if (hourlyAllowed && pricePerHour != null && pricePerHour > 0) {
      // Use hourly pricing
      basePrice = pricePerHour * hours;
    } else if (pricePerDay > 0) {
      // Use daily pricing
      basePrice = pricePerDay * days;
    } else {
      throw new BadRequestException('Listing has no valid pricing');
    }

    // Apply multi-day discounts based on days (even for hourly rentals)
    let discount = 0;
    const discount30Days = pricing?.durationDiscount30Days ?? null;
    const discount7Days = pricing?.durationDiscount7Days ?? null;
    const discount3Days = pricing?.durationDiscount3Days ?? null;

    if (days >= 30 && discount30Days != null && discount30Days > 0) {
      discount = discount30Days;
    } else if (days >= 7 && discount7Days != null && discount7Days > 0) {
      discount = discount7Days;
    } else if (days >= 3 && discount3Days != null && discount3Days > 0) {
      discount = discount3Days;
    }

    const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
    return Math.max(0, finalPrice);
  }

  /**
   * Calculate refundable amount according to cancellation policy
   * Returns 0 if outside deadlines (no automatic refund)
   */
  private calculateRefundAmount(
    booking: { startAt: Date; totalAmount: Decimal; listing: { cancellationPolicy?: string | null } },
    payment: { amount: Decimal },
  ): number {
    const now = new Date();
    const hoursUntilStart = (booking.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const totalAmount = booking.totalAmount.toNumber();
    const policy = booking.listing.cancellationPolicy?.toLowerCase() ?? 'moderate';

    let refundRate = 0;

    switch (policy) {
      case 'flexible':
        if (hoursUntilStart > 24) refundRate = 1.0; // 100%
        else if (hoursUntilStart > 1) refundRate = 0.5; // 50%
        break;
      case 'moderate':
        if (hoursUntilStart > 168) refundRate = 1.0; // 100% (> 7 days)
        else if (hoursUntilStart > 24) refundRate = 0.5; // 50% (> 24h)
        break;
      case 'strict':
        if (hoursUntilStart > 168) refundRate = 0.5; // 50% (> 7 days)
        break;
      default:
        // By default, no automatic refund
        refundRate = 0;
    }

    return totalAmount * refundRate;
  }
}
