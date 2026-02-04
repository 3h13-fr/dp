import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EmailProcessor } from './email.processor';
import { NotificationProcessor } from './notification.processor';
import { QueueService } from './queue.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    EventsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notification' },
    ),
  ],
  providers: [EmailProcessor, NotificationProcessor, QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
