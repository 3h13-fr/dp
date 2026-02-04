import Stripe from 'stripe';

export class StripeService {
  readonly client: Stripe | null;

  constructor(secretKey: string) {
    this.client = secretKey ? new Stripe(secretKey, { apiVersion: '2023-10-16' }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /** Amount in currency units (e.g. EUR) → cents for Stripe */
  toCents(amount: number, currency: string): number {
    const zeroDecimal = ['jpy', 'krw', 'vnd', 'clp', 'pyg'].includes(currency.toLowerCase());
    return zeroDecimal ? Math.round(amount) : Math.round(amount * 100);
  }

  /** Create PaymentIntent for booking or extra (capture automatically) */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata: { bookingId: string; type: string; [k: string]: string };
    customerId?: string;
  }): Promise<Stripe.PaymentIntent | null> {
    if (!this.client) return null;
    const amountInCents = this.toCents(params.amount, params.currency);
    if (amountInCents < 1) return null;

    const pi = await this.client.paymentIntents.create({
      amount: amountInCents,
      currency: params.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: params.metadata,
      ...(params.customerId && { customer: params.customerId }),
    });
    return pi;
  }

  /** Create PaymentIntent for caution (capture_method: manual = preauth, release later) */
  async createCautionHold(params: {
    amount: number;
    currency: string;
    metadata: { bookingId: string; [k: string]: string };
    customerId?: string;
  }): Promise<Stripe.PaymentIntent | null> {
    if (!this.client) return null;
    const amountInCents = this.toCents(params.amount, params.currency);
    if (amountInCents < 1) return null;

    const pi = await this.client.paymentIntents.create({
      amount: amountInCents,
      currency: params.currency.toLowerCase(),
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      metadata: { ...params.metadata, type: 'caution' },
      ...(params.customerId && { customer: params.customerId }),
    });
    return pi;
  }

  /** Capture a manual PaymentIntent (e.g. caution charge after incident) */
  async capturePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    if (!this.client) return null;
    return this.client.paymentIntents.capture(paymentIntentId);
  }

  /** Cancel a PaymentIntent (e.g. release caution without charging) */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    if (!this.client) return null;
    return this.client.paymentIntents.cancel(paymentIntentId);
  }

  /** Refund a succeeded charge (full or partial) */
  async refundPaymentIntent(
    paymentIntentId: string,
    amount?: number,
    currency?: string,
  ): Promise<Stripe.Refund | null> {
    if (!this.client) return null;
    const params: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
    if (amount != null && currency) {
      params.amount = this.toCents(amount, currency);
    }
    return this.client.refunds.create(params);
  }

  /** Construct webhook event (verify signature) */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    if (!this.client) throw new Error('Stripe not configured');
    return this.client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
