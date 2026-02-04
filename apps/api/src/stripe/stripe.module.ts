import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe.service';

@Global()
@Module({
  providers: [
    {
      provide: StripeService,
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('STRIPE_SECRET_KEY');
        return new StripeService(secret ?? '');
      },
      inject: [ConfigService],
    },
  ],
  exports: [StripeService],
})
export class StripeModule {}
