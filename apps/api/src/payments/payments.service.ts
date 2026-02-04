import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { QueueService } from '../queue/queue.service';
import { PaymentStatus, BookingStatus } from 'database';
import { Decimal } from 'database';

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
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, guestId },
      include: { listing: true },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (type === 'booking' && new Decimal(amount).toNumber() !== booking.totalAmount.toNumber()) {
      throw new BadRequestException('Amount does not match booking total');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { bookingId, type, status: PaymentStatus.PENDING },
    });
    if (existing?.stripePaymentId) {
      const intent = this.stripe.client?.paymentIntents.retrieve(existing.stripePaymentId);
      if (intent) return { paymentId: existing.id, clientSecret: (await intent).client_secret };
    }

    const pi = await this.stripe.createPaymentIntent({
      amount,
      currency,
      metadata: { bookingId, type },
    });
    if (!pi) throw new BadRequestException('Stripe not configured');

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: new Decimal(amount),
        currency,
        status: PaymentStatus.PENDING,
        stripePaymentId: pi.id,
        type,
        metadata: { stripePaymentIntentId: pi.id },
      },
    });
    return { paymentId: payment.id, clientSecret: pi.client_secret };
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
    return { paymentId: payment.id, clientSecret: pi.client_secret };
  }

  /** Capture a caution (charge the customer after incident) */
  async captureCaution(bookingId: string, paymentId: string, hostId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, bookingId, type: 'caution' },
      include: { booking: true },
    });
    if (!payment || payment.booking.hostId !== hostId) throw new BadRequestException('Payment not found');
    if (!payment.stripePaymentId) throw new BadRequestException('No Stripe payment');
    if (payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Already captured or cancelled');

    await this.stripe.capturePaymentIntent(payment.stripePaymentId);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCEEDED },
    });
    return { success: true };
  }

  /** Release caution without charging */
  async releaseCaution(bookingId: string, paymentId: string, hostId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, bookingId, type: 'caution' },
      include: { booking: true },
    });
    if (!payment || payment.booking.hostId !== hostId) throw new BadRequestException('Payment not found');
    if (!payment.stripePaymentId) throw new BadRequestException('No Stripe payment');
    if (payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Already captured or cancelled');

    await this.stripe.cancelPaymentIntent(payment.stripePaymentId);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED },
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
      include: { booking: { include: { guest: { select: { email: true, preferredLang: true } } } } },
    });
    if (!payment) return;

    await this.prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntentId },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    if (payment.type === 'booking' && payment.booking) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });
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

  async handlePaymentIntentFailed(paymentIntentId: string) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentId: paymentIntentId },
      data: { status: PaymentStatus.FAILED },
    });
  }
}
