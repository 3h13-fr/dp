import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StripeModule } from './stripe/stripe.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { MessagesModule } from './messages/messages.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StripeModule,
    EventsModule,
    QueueModule,
    UploadModule,
    AuthModule,
    AdminModule,
    UsersModule,
    ListingsModule,
    AvailabilityModule,
    BookingsModule,
    PaymentsModule,
    MessagesModule,
    ReviewsModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
