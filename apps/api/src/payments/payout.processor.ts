import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { QueueService } from '../queue/queue.service';
import { BookingStatus, PayoutStatus } from 'database';

@Injectable()
export class PayoutProcessor implements OnModuleInit {
  private readonly logger = new Logger(PayoutProcessor.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private queue: QueueService,
  ) {}

  onModuleInit() {
    // Run every 6 hours
    this.intervalId = setInterval(() => {
      this.processScheduledPayouts().catch((err) => {
        this.logger.error('Error processing scheduled payouts', err);
      });
    }, 6 * 60 * 60 * 1000);

    // Run immediately on startup
    this.processScheduledPayouts().catch((err) => {
      this.logger.error('Error processing scheduled payouts on startup', err);
    });
  }

  async processScheduledPayouts() {
    const now = new Date();

    // Find HostPayouts scheduled with scheduledAt passed
    const payoutsToProcess = await this.prisma.hostPayout.findMany({
      where: {
        status: PayoutStatus.SCHEDULED,
        scheduledAt: { lte: now },
        booking: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
      },
      include: {
        booking: { include: { listing: true } },
        host: { select: { id: true, email: true, stripeAccountId: true } },
      },
    });

    for (const payout of payoutsToProcess) {
      // Verify that the booking is actually finished
      if (new Date(payout.booking.endAt) > now) {
        continue; // Not finished yet
      }

      // TODO: Check checkout status (to be implemented later)
      // For now, we consider OK if no dispute reported

      // Check if host has a Stripe account
      if (!payout.host.stripeAccountId) {
        // Log error and notify host that they need to configure their account
        this.logger.warn(`Host ${payout.hostId} does not have stripeAccountId configured`);
        // TODO: Enqueue notification to host
        continue;
      }

      // Mark as PROCESSING
      await this.prisma.hostPayout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.PROCESSING },
      });

      try {
        // Create Stripe transfer to host
        const transfer = await this.stripe.createTransferToHost({
          amount: payout.hostAmount.toNumber(),
          currency: payout.currency,
          destination: payout.host.stripeAccountId,
          metadata: { bookingId: payout.bookingId, payoutId: payout.id },
        });

        if (transfer) {
          // Mark as PAID
          await this.prisma.hostPayout.update({
            where: { id: payout.id },
            data: {
              status: PayoutStatus.PAID,
              stripeTransferId: transfer.id,
              paidAt: new Date(),
            },
          });

          // Notify host
          if (payout.host.email) {
            // TODO: Enqueue host payout confirmation email
            this.logger.log(`Payout ${payout.id} processed successfully for host ${payout.hostId}`);
          }
        } else {
          throw new Error('Transfer creation failed');
        }
      } catch (error) {
        // Mark as FAILED
        await this.prisma.hostPayout.update({
          where: { id: payout.id },
          data: { status: PayoutStatus.FAILED },
        });

        // Log error
        this.logger.error(`Failed to process payout ${payout.id}`, error);

        // TODO: Notify admin and host
      }
    }

    if (payoutsToProcess.length > 0) {
      this.logger.log(`Processed ${payoutsToProcess.length} payout(s)`);
    }
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
