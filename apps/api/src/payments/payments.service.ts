import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { QueueService } from '../queue/queue.service';
import { PaymentStatus, BookingStatus, DepositStatus } from 'database';
import { Decimal } from 'database';
import { Prisma } from 'database';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private queue: QueueService,
  ) {}

  async findForBooking(bookingId: string): Promise<unknown[]> {
    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Create a PaymentIntent for a booking (total) or extra; returns client_secret for Stripe Elements */
  async createPaymentIntent(
    bookingId: string,
    type: 'booking' | 'extra',
    amount: number,
    currency: string,
    guestId: string,
    idempotencyKey?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // Lock the booking row to prevent concurrent modifications
        const booking = await tx.$queryRaw<Array<{
          id: string;
          guestId: string;
          totalAmount: Decimal;
          status: BookingStatus;
          startAt: Date;
          listingId: string;
        }>>`
          SELECT b.id, b."guestId", b."totalAmount", b.status, b."startAt", b."listingId"
          FROM "Booking" b
          WHERE b.id = ${bookingId} AND b."guestId" = ${guestId}
          FOR UPDATE
        `;

        if (!booking || booking.length === 0) {
          throw new BadRequestException('Booking not found');
        }

        const bookingData = booking[0];
        if (type === 'booking' && new Decimal(amount).toNumber() !== bookingData.totalAmount.toNumber()) {
          throw new BadRequestException('Amount does not match booking total');
        }

        // Check for existing payment with same idempotency key
        if (idempotencyKey) {
          const existingWithKey = await tx.payment.findFirst({
            where: {
              bookingId,
              type,
              metadata: {
                path: ['idempotencyKey'],
                equals: idempotencyKey,
              } as Prisma.JsonFilter,
            },
          });
          if (existingWithKey?.stripePaymentId) {
            const intent = await this.stripe.client?.paymentIntents.retrieve(existingWithKey.stripePaymentId);
            if (intent) {
              return { paymentId: existingWithKey.id, clientSecret: intent.client_secret };
            }
          }
        }

        // Check for existing PENDING payment (with unique constraint protection)
        const existing = await tx.payment.findFirst({
          where: { bookingId, type, status: PaymentStatus.PENDING },
        });
        if (existing?.stripePaymentId) {
          const intent = await this.stripe.client?.paymentIntents.retrieve(existing.stripePaymentId);
          if (intent) {
            return { paymentId: existing.id, clientSecret: intent.client_secret };
          }
        }

        // Get listing to check if manual approval required
        const listing = await tx.listing.findUnique({
          where: { id: bookingData.listingId },
        });
        if (!listing) throw new BadRequestException('Listing not found');

        // For manual bookings: create pre-authorization (hold)
        // For instant bookings: create payment intent with automatic capture
        const isManual = listing.manualApprovalRequired && type === 'booking';
        const pi = isManual
          ? await this.stripe.createCautionHold({
              amount,
              currency,
              metadata: { bookingId, type },
            })
          : await this.stripe.createPaymentIntent({
              amount,
              currency,
              metadata: { bookingId, type },
            });

        if (!pi) throw new BadRequestException('Stripe not configured');

        // Calculate approval deadline for manual bookings
        let approvalDeadline: Date | null = null;
        if (isManual) {
          const now = new Date();
          const hoursUntilStart = (new Date(bookingData.startAt).getTime() - now.getTime()) / (1000 * 60 * 60);
          const minNotice = listing.minBookingNoticeHours ?? 24;

          // Dynamic deadline: if startAt < minNotice, deadline = 1h, else minNotice / 2 (min 1h)
          const approvalHours = hoursUntilStart < minNotice
            ? 1 // Minimum 1h if reservation very close
            : Math.max(1, Math.floor(minNotice / 2)); // Otherwise, half of minimum notice

          approvalDeadline = new Date(now.getTime() + approvalHours * 60 * 60 * 1000);
        }

        const payment = await tx.payment.create({
          data: {
            bookingId,
            amount: new Decimal(amount),
            currency,
            status: PaymentStatus.PENDING,
            stripePaymentId: pi.id,
            type,
            metadata: {
              stripePaymentIntentId: pi.id,
              ...(idempotencyKey && { idempotencyKey }),
            } as Prisma.InputJsonValue,
          },
        });

        // Update booking status and deadline for manual bookings
        if (isManual && approvalDeadline) {
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.PENDING_APPROVAL,
              approvalDeadline,
            },
          });
        }

        return { paymentId: payment.id, clientSecret: pi.client_secret };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /** Create a caution hold (preauth, capture_method: manual). Release via cancel or capture. */
  async createCautionHold(bookingId: string, guestId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, guestId },
      include: { listing: true },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    const amount = booking.cautionAmount?.toNumber() ?? booking.listing?.caution?.toNumber() ?? 0;
    if (amount <= 0) throw new BadRequestException('No caution amount');

    const existing = await this.prisma.payment.findFirst({
      where: { bookingId, type: 'caution', status: PaymentStatus.PENDING },
    });
    if (existing?.stripePaymentId) {
      const intent = this.stripe.client?.paymentIntents.retrieve(existing.stripePaymentId);
      if (intent) return { paymentId: existing.id, clientSecret: (await intent).client_secret };
    }

    const pi = await this.stripe.createCautionHold({
      amount,
      currency: booking.currency,
      metadata: { bookingId },
    });
    if (!pi) throw new BadRequestException('Stripe not configured');

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: new Decimal(amount),
        currency: booking.currency,
        status: PaymentStatus.PENDING,
        stripePaymentId: pi.id,
        type: 'caution',
        metadata: { stripePaymentIntentId: pi.id },
      },
    });

    await this.prisma.deposit.create({
      data: {
        bookingId,
        paymentId: payment.id,
        status: DepositStatus.PREAUTHORIZED,
      },
    });

    return { paymentId: payment.id, clientSecret: pi.client_secret };
  }

  /** Capture a caution (admin only — no host check) */
  async captureCautionForAdmin(
    bookingId: string,
    paymentId: string,
    _adminId: string,
    captureAmount?: number,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, bookingId, type: 'caution' },
      include: { booking: true },
    });
    if (!payment) throw new BadRequestException('Payment not found');
    if (!payment.stripePaymentId) throw new BadRequestException('No Stripe payment');
    if (payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Already captured or cancelled');

    const amountToCapture = captureAmount ?? payment.amount.toNumber();
    if (amountToCapture > payment.amount.toNumber()) {
      throw new BadRequestException('Capture amount cannot exceed deposit amount');
    }

    const result = await this.stripe.capturePaymentIntent(
      payment.stripePaymentId,
      amountToCapture,
      payment.currency,
    );
    if (!result) throw new BadRequestException('Stripe not configured');

    const depositStatus =
      amountToCapture >= payment.amount.toNumber()
        ? DepositStatus.CAPTURED_FULL
        : DepositStatus.CAPTURED_PARTIAL;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    await this.prisma.deposit.updateMany({
      where: { paymentId },
      data: { status: depositStatus },
    });

    return { success: true, capturedAmount: amountToCapture };
  }

  /** Release caution without charging (admin only) */
  async releaseCautionForAdmin(bookingId: string, paymentId: string, _adminId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, bookingId, type: 'caution' },
      include: { booking: true },
    });
    if (!payment) throw new BadRequestException('Payment not found');
    if (!payment.stripePaymentId) throw new BadRequestException('No Stripe payment');
    if (payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Already captured or cancelled');

    await this.stripe.cancelPaymentIntent(payment.stripePaymentId);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });

    await this.prisma.deposit.updateMany({
      where: { paymentId },
      data: { status: DepositStatus.RELEASED },
    });

    return { success: true };
  }

  /** Refund a payment (full or partial) */
  async refund(paymentId: string, amount?: number, currency?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, status: PaymentStatus.SUCCEEDED },
    });
    if (!payment?.stripePaymentId) throw new BadRequestException('Payment not found or not succeeded');
    await this.stripe.refundPaymentIntent(
      payment.stripePaymentId,
      amount ?? payment.amount.toNumber(),
      currency ?? payment.currency,
    );
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
    });
    return { success: true };
  }

  /** Update payment status from Stripe webhook; if type=booking, set Booking to CONFIRMED and enqueue confirmation email */
  async handlePaymentIntentSucceeded(paymentIntentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentId: paymentIntentId },
      include: {
        booking: {
          include: {
            listing: true,
            guest: { select: { email: true, preferredLang: true } },
            host: { select: { id: true, email: true } },
          },
        },
      },
    });
    if (!payment) return;

    await this.prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntentId },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    if (payment.type === 'booking' && payment.booking) {
      const listing = payment.booking.listing;
      const totalAmount = payment.booking.totalAmount.toNumber();
      const COMMISSION_RATE = 0.15; // 15%
      const commissionAmount = totalAmount * COMMISSION_RATE;
      const hostAmount = totalAmount - commissionAmount;

      if (listing.manualApprovalRequired) {
        // For manual bookings: PaymentIntent is in pre-authorization
        // Status PENDING_APPROVAL already set during creation
        // Notify host that approval is required
        const hostEmail = payment.booking.host?.email;
        if (hostEmail) {
          await this.queue.enqueueHostApprovalNotification(
            payment.bookingId,
            hostEmail,
            payment.booking.approvalDeadline,
          );
        }
      } else {
        // For instant bookings: confirm immediately
        await this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });

        // Create HostPayout (scheduled for after booking ends)
        await this.prisma.hostPayout.create({
          data: {
            bookingId: payment.bookingId,
            hostId: payment.booking.hostId,
            totalAmount: new Decimal(totalAmount),
            commissionAmount: new Decimal(commissionAmount),
            hostAmount: new Decimal(hostAmount),
            currency: payment.booking.currency,
            status: 'SCHEDULED',
            scheduledAt: payment.booking.endAt,
          },
        });

        // Send confirmation email
        const locale = payment.booking.guest?.preferredLang ?? 'en';
        const guestEmail = payment.booking.guest?.email;
        if (guestEmail) {
          await this.queue.enqueueBookingConfirmationEmail(
            payment.bookingId,
            guestEmail,
            locale,
          );
        }
      }
    }
  }

  async handlePaymentIntentFailed(paymentIntentId: string) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntentId },
      data: { status: PaymentStatus.FAILED },
    });
  }
}
