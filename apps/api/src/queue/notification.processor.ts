import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationJobData } from './queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData, void, string>): Promise<void> {
    const { userId, type, title, body, data } = job.data;
    this.logger.log(`[Notification] ${type} → user ${userId}`);
    await this.prisma.notification.create({
      data: { userId, type, title, body, data: (data ?? undefined) as import('database').Prisma.InputJsonValue | undefined },
    });
    this.events.emitToUser(userId, 'notification', { type, title, body, data });
  }
}
