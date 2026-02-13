import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus, PayoutStatus, BookingStatus } from 'database';
import { Decimal } from 'database';

@Injectable()
export class AdminPaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private payments: PaymentsService,
  ) {}

  /** Get all payments with filters */
  async getPayments(limit = 50, offset = 0, filters?: {
    bookingId?: string;
    status?: PaymentStatus;
    type?: string;
  }) {
    const where: any = {};
    if (filters?.bookingId) where.bookingId = filters.bookingId;
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              listing: { select: { id: true, title: true, displayName: true } },
              guest: { select: { id: true, email: true, firstName: true, lastName: true } },
              host: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
          auditLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total };
  }

  /** Get payment by ID */
  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            listing: true,
            guest: true,
            host: true,
          },
        },
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  /** Refund a payment (full or partial) */
  async refundPayment(paymentId: string, amount?: number, reason?: string, adminId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Payment must be succeeded to refund');
    }

    const refundAmount = amount ?? payment.amount.toNumber();
    if (refundAmount > payment.amount.toNumber()) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    // Log before refund
    await this.prisma.paymentAuditLog.create({
      data: {
        paymentId,
        action: 'refund',
        actorId: adminId || 'system',
        actorType: 'admin',
        oldValue: { status: payment.status, amount: payment.amount.toNumber() },
        newValue: { status: 'REFUNDED', refundAmount },
        reason,
      },
    });

    // Perform refund
    await this.payments.refund(paymentId, refundAmount, payment.currency);

    return { success: true, refundAmount };
  }

  /** Override payment amount (for manual adjustments) */
  async overridePaymentAmount(paymentId: string, newAmount: number, reason: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // Log override
    await this.prisma.paymentAuditLog.create({
      data: {
        paymentId,
        action: 'override_amount',
        actorId: adminId,
        actorType: 'admin',
        oldValue: { amount: payment.amount.toNumber() },
        newValue: { amount: newAmount },
        reason,
      },
    });

    // Update payment (note: this doesn't update Stripe, only DB)
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { amount: new Decimal(newAmount) },
    });

    return { success: true };
  }

  /** Retry failed payment */
  async retryPayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.FAILED) {
      throw new BadRequestException('Payment must be failed to retry');
    }

    // Log retry
    await this.prisma.paymentAuditLog.create({
      data: {
        paymentId,
        action: 'retry',
        actorId: adminId,
        actorType: 'admin',
        oldValue: { status: payment.status },
        newValue: { status: 'PENDING' },
      },
    });

    // Create new payment intent
    const result = await this.payments.createPaymentIntent(
      payment.bookingId,
      payment.type as 'booking' | 'extra',
      payment.amount.toNumber(),
      payment.currency,
      payment.booking.guestId,
    );

    return result;
  }

  /** Get all payouts */
  async getPayouts(limit = 50, offset = 0, filters?: {
    hostId?: string;
    status?: PayoutStatus;
    bookingId?: string;
  }) {
    const where: any = {};
    if (filters?.hostId) where.hostId = filters.hostId;
    if (filters?.status) where.status = filters.status;
    if (filters?.bookingId) where.bookingId = filters.bookingId;

    const [items, total] = await Promise.all([
      this.prisma.hostPayout.findMany({
        where,
        include: {
          booking: {
            include: {
              listing: { select: { id: true, title: true, displayName: true } },
              guest: { select: { id: true, email: true } },
            },
          },
          host: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.hostPayout.count({ where }),
    ]);

    return { items, total };
  }

  /** Get payout by ID */
  async getPayoutById(payoutId: string) {
    const payout = await this.prisma.hostPayout.findUnique({
      where: { id: payoutId },
      include: {
        booking: {
          include: {
            listing: true,
            guest: true,
            host: true,
          },
        },
      },
    });

    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  /** Force process a payout (admin override) */
  async forceProcessPayout(payoutId: string, adminId: string) {
    const payout = await this.prisma.hostPayout.findUnique({
      where: { id: payoutId },
      include: {
        host: { select: { stripeAccountId: true } },
        booking: true,
      },
    });

    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.SCHEDULED) {
      throw new BadRequestException('Payout must be scheduled to process');
    }

    if (!payout.host.stripeAccountId) {
      throw new BadRequestException('Host does not have Stripe account configured');
    }

    // Mark as PROCESSING
    await this.prisma.hostPayout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.PROCESSING },
    });

    try {
      // Create transfer
      const transfer = await this.stripe.createTransferToHost({
        amount: payout.hostAmount.toNumber(),
        currency: payout.currency,
        destination: payout.host.stripeAccountId,
        metadata: { bookingId: payout.bookingId, payoutId, adminForced: 'true' },
      });

      if (transfer) {
        await this.prisma.hostPayout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.PAID,
            stripeTransferId: transfer.id,
            paidAt: new Date(),
          },
        });

        // Log admin action
        await this.prisma.adminAction.create({
          data: {
            adminId,
            action: 'force_process_payout',
            resource: 'HostPayout',
            resourceId: payoutId,
            details: { transferId: transfer.id },
            result: 'success',
          },
        });

        return { success: true, transferId: transfer.id };
      } else {
        throw new Error('Transfer creation failed');
      }
    } catch (error) {
      await this.prisma.hostPayout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.FAILED },
      });

      await this.prisma.adminAction.create({
        data: {
          adminId,
          action: 'force_process_payout',
          resource: 'HostPayout',
          resourceId: payoutId,
          details: {},
          result: 'failed',
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  /** Reverse a payout transfer (for disputes) */
  async reversePayout(payoutId: string, reason: string, adminId: string) {
    const payout = await this.prisma.hostPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PAID) {
      throw new BadRequestException('Payout must be paid to reverse');
    }
    if (!payout.stripeTransferId) {
      throw new BadRequestException('Payout does not have a Stripe transfer ID');
    }

    try {
      // Reverse the transfer
      const reversal = await this.stripe.reverseTransfer(payout.stripeTransferId);

      if (reversal) {
        // Update payout status
        await this.prisma.hostPayout.update({
          where: { id: payoutId },
          data: { status: PayoutStatus.CANCELLED },
        });

        // Log admin action
        await this.prisma.adminAction.create({
          data: {
            adminId,
            action: 'reverse_payout',
            resource: 'HostPayout',
            resourceId: payoutId,
            details: { reversalId: reversal.id, reason },
            result: 'success',
          },
        });

        return { success: true, reversalId: reversal.id };
      } else {
        throw new Error('Reversal creation failed');
      }
    } catch (error) {
      await this.prisma.adminAction.create({
        data: {
          adminId,
          action: 'reverse_payout',
          resource: 'HostPayout',
          resourceId: payoutId,
          details: { reason },
          result: 'failed',
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }
}
