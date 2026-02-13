import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NhtsaSyncService } from './nhtsa-sync.service';

@Processor('nhtsa-sync')
export class NhtsaSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(NhtsaSyncProcessor.name);

  constructor(private nhtsaSync: NhtsaSyncService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Starting NHTSA sync job (ID: ${job.id})`);

    try {
      const stats = await this.nhtsaSync.syncAll();

      this.logger.log(
        `NHTSA sync job completed: ${stats.makesProcessed} makes (${stats.makesCreated} created, ${stats.makesUpdated} updated), ${stats.modelsProcessed} models (${stats.modelsCreated} created, ${stats.modelsUpdated} updated)`,
      );

      if (stats.errors.length > 0) {
        this.logger.warn(`NHTSA sync completed with ${stats.errors.length} errors`);
        stats.errors.forEach((error) => this.logger.error(error));
      }

      // Store stats in job data for monitoring
      await job.updateData({ stats });
    } catch (error) {
      this.logger.error(`NHTSA sync job failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw to trigger retry mechanism
    }
  }
}
