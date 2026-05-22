import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeSDK = require('stripe');

@Injectable()
export class PaymentsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly stripe: any = null;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key && key.startsWith('sk_')) {
      this.stripe = new StripeSDK(key, { apiVersion: '2026-04-22.dahlia' });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured — payment intents will return a mock response.',
      );
    }
  }

  async createPaymentIntent(amountAed: number): Promise<{ clientSecret: string; id: string }> {
    const amountFils = Math.round(amountAed * 100);

    if (!this.stripe) {
      return {
        clientSecret: `pi_demo_${Date.now()}_secret_demo`,
        id: `pi_demo_${Date.now()}`,
      };
    }

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: amountFils,
        currency: 'aed',
        automatic_payment_methods: { enabled: true },
        metadata: { app: 'pawsphere' },
      });

      if (!intent.client_secret) {
        throw new InternalServerErrorException('Stripe did not return a client secret.');
      }

      return { clientSecret: intent.client_secret, id: intent.id };
    } catch (err) {
      this.logger.error('Stripe createPaymentIntent failed', err);
      throw new InternalServerErrorException('Payment initialisation failed.');
    }
  }

  async refundPaymentIntent(paymentIntentId: string): Promise<string> {
    if (!this.stripe) {
      return `re_demo_${Date.now()}`;
    }
    const refund = await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    return refund.id as string;
  }
}
