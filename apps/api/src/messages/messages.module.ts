import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { EventsModule } from '../events/events.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [EventsModule, QueueModule],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
