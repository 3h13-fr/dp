import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { QueueService } from '../queue/queue.service';
import { BookingStatus, PaymentStatus } from 'database';

@Injectable()
export class BookingExpiryProcessor implements OnModuleInit {
  private readonly logger = new Logger(BookingExpiryProcessor.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private queue: QueueService,
  ) {}

  onModuleInit() {
    // Run every 15 minutes
    this.intervalId = setInterval(() => {
      this.handleExpiredApprovals().catch((err) => {
        this.logger.error('Error processing expired approvals', err);
      });
    }, 15 * 60 * 1000);

    // Run immediately on startup
    this.handleExpiredApprovals().catch((err) => {
      this.logger.error('Error processing expired approvals on startup', err);
    });
  }

  async handleExpiredApprovals() {
    const now = new Date();

    // Find bookings pending approval with expired deadline
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_APPROVAL,
        approvalDeadline: { lte: now },
        approvalExpired: false, // Avoid double processing
      },
      include: {
        listing: true,
        guest: { select: { email: true, preferredLang: true } },
        payments: {
          where: { type: 'booking', status: PaymentStatus.PENDING },
        },
      },
    });

    for (const booking of expiredBookings) {
      try {
        // Mark as expired immediately to avoid double processing
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { approvalExpired: true },
        });

        // Cancel the pre-authorization
        const payment = booking.payments[0];
        if (payment?.stripePaymentId) {
          await this.stripe.cancelPaymentIntent(payment.stripePaymentId);
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.FAILED },
          });
        }

        // Cancel the booking
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED },
        });

        // Send cancellation email to guest
        if (booking.guest?.email) {
          const locale = booking.guest.preferredLang ?? 'en';
          await this.queue.enqueueBookingCancelledEmail(booking.id, booking.guest.email, locale);
        }

        this.logger.log(`Expired booking ${booking.id} automatically cancelled`);
      } catch (error) {
        this.logger.error(`Failed to process expired booking ${booking.id}`, error);
      }
    }

    if (expiredBookings.length > 0) {
      this.logger.log(`Processed ${expiredBookings.length} expired booking(s)`);
    }
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
