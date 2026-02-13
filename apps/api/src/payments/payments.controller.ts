import { BadRequestException, Body, Controller, Get, Param, Post, Req, Headers, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { StripeService } from '../stripe/stripe.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';
import type { Request } from 'express';
import Stripe from 'stripe';

class CreatePaymentIntentDto {
  bookingId: string;
  type: 'booking' | 'extra';
  amount: number;
  currency: string;
  idempotencyKey?: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private payments: PaymentsService,
    private stripeService: StripeService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('booking/:bookingId')
  forBooking(@Param('bookingId') bookingId: string): Promise<unknown[]> {
    return this.payments.findForBooking(bookingId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create-payment-intent')
  async createPaymentIntent(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.payments.createPaymentIntent(
      dto.bookingId,
      dto.type,
      dto.amount,
      dto.currency,
      user.id,
      idempotencyKey || dto.idempotencyKey,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create-caution-hold')
  async createCautionHold(
    @CurrentUser() user: User,
    @Body() body: { bookingId: string },
  ) {
    return this.payments.createCautionHold(body.bookingId, user.id);
  }

  // Note: capture-caution and release-caution removed from host/guest — admin only via /admin/deposits

  @Post('webhook')
  async webhook(
    @Req() req: Request & { body: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.body;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      return { received: false };
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new BadRequestException('Webhook secret not set');

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        webhookSecret,
      ) as Stripe.Event;
    } catch (err) {
      throw new BadRequestException('Invalid signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.payments.handlePaymentIntentSucceeded(pi.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.payments.handlePaymentIntentFailed(pi.id);
        break;
      }
      default:
        break;
    }
    return { received: true };
  }
}
