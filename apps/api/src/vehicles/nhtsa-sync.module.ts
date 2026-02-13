import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { NhtsaSyncService } from './nhtsa-sync.service';
import { NhtsaSyncProcessor } from './nhtsa-sync.processor';
import { MakeModelService } from './make-model.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'nhtsa-sync' }),
  ],
  providers: [NhtsaSyncService, NhtsaSyncProcessor, MakeModelService],
  exports: [NhtsaSyncService],
})
export class NhtsaSyncModule implements OnModuleInit {
  private readonly logger = new Logger(NhtsaSyncModule.name);

  constructor(@InjectQueue('nhtsa-sync') private nhtsaSyncQueue: Queue) {}

  async onModuleInit() {
    // Schedule recurring job: daily at 2 AM
    // Cron pattern: 0 2 * * * (every day at 2:00 AM)
    const cronPattern = process.env.NHTSA_SYNC_CRON || '0 2 * * *';

    try {
      // Remove any existing repeatable job with the same key
      const repeatableJobs = await this.nhtsaSyncQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.key === 'nhtsa-sync-daily') {
          await this.nhtsaSyncQueue.removeRepeatableByKey(job.key);
        }
      }

      // Add repeatable job
      await this.nhtsaSyncQueue.add(
        'sync-all',
        {},
        {
          repeat: {
            pattern: cronPattern,
            key: 'nhtsa-sync-daily',
          },
          jobId: 'nhtsa-sync-recurring',
        },
      );

      this.logger.log(`NHTSA sync scheduled with cron pattern: ${cronPattern}`);
    } catch (error) {
      this.logger.error(`Failed to schedule NHTSA sync job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
