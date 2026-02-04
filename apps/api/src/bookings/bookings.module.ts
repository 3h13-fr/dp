import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../queue/queue.module';
import { AvailabilityModule } from '../availability/availability.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [EventsModule, QueueModule, AvailabilityModule, PaymentsModule],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
