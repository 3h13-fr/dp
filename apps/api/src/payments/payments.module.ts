import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PayoutProcessor } from './payout.processor';
import { QueueModule } from '../queue/queue.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [QueueModule, StripeModule],
  providers: [PaymentsService, PayoutProcessor],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
