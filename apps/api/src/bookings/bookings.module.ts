import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../queue/queue.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [EventsModule, QueueModule, AvailabilityModule],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
