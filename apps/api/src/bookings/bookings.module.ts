import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingExpiryProcessor } from './booking-expiry.processor';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../queue/queue.module';
import { AvailabilityModule } from '../availability/availability.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { StripeModule } from '../stripe/stripe.module';
import { MarketsModule } from '../markets/markets.module';

@Module({
  imports: [EventsModule, QueueModule, AvailabilityModule, PaymentsModule, ReviewsModule, StripeModule, MarketsModule],
  providers: [BookingsService, BookingExpiryProcessor],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
