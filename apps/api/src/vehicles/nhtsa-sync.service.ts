import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferenceStatus } from 'database';
import { MakeModelService } from './make-model.service';
import { normalizeForSlug } from './utils/slug.util';

const NHTSA_API_BASE = 'https://vpic.nhtsa.dot.gov/api';
const RATE_LIMIT_DELAY_MS = 150; // 150ms entre chaque appel = ~400 req/min (sous la limite de 1000-2000)

interface NhtsaMake {
  Make_ID: number;
  Make_Name: string;
}

interface NhtsaModel {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
}

interface NhtsaApiResponse<T> {
  Count: number;
  Message: string;
  Results: T[];
}

export interface SyncStats {
  makesProcessed: number;
  makesCreated: number;
  makesUpdated: number;
  modelsProcessed: number;
  modelsCreated: number;
  modelsUpdated: number;
  errors: string[];
}

@Injectable()
export class NhtsaSyncService {
  private readonly logger = new Logger(NhtsaSyncService.name);

  constructor(
    private prisma: PrismaService,
    private makeModel: MakeModelService,
  ) {}

  /**
   * Sleep utility for rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch all makes from NHTSA API
   */
  private async fetchAllMakes(): Promise<NhtsaMake[]> {
    const url = `${NHTSA_API_BASE}/vehicles/GetAllMakes?format=json`;
    this.logger.log(`Fetching all makes from NHTSA...`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`NHTSA API returned ${response.status}: ${response.statusText}`);
      }

      const data: NhtsaApiResponse<NhtsaMake> = await response.json();

      if (!data.Results || data.Results.length === 0) {
        this.logger.warn('No makes returned from NHTSA API');
        return [];
      }

      this.logger.log(`Fetched ${data.Results.length} makes from NHTSA`);
      return data.Results;
    } catch (error) {
      this.logger.error(`Error fetching makes from NHTSA: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Fetch all models for a specific make from NHTSA API
   */
  private async fetchModelsForMake(makeId: number): Promise<NhtsaModel[]> {
    const url = `${NHTSA_API_BASE}/vehicles/GetModelsForMakeId/${makeId}?format=json`;

    try {
      // Rate limiting: wait before each request
      await this.sleep(RATE_LIMIT_DELAY_MS);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        // If 429 (Too Many Requests), wait longer and retry once
        if (response.status === 429) {
          this.logger.warn(`Rate limited for makeId ${makeId}, waiting 5 seconds...`);
          await this.sleep(5000);
          // Retry once
          const retryResponse = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          if (!retryResponse.ok) {
            throw new Error(`NHTSA API returned ${retryResponse.status} after retry`);
          }
          const retryData: NhtsaApiResponse<NhtsaModel> = await retryResponse.json();
          return retryData.Results || [];
        }
        throw new Error(`NHTSA API returned ${response.status}: ${response.statusText}`);
      }

      const data: NhtsaApiResponse<NhtsaModel> = await response.json();
      return data.Results || [];
    } catch (error) {
      this.logger.warn(`Error fetching models for makeId ${makeId}: ${error instanceof Error ? error.message : String(error)}`);
      // Return empty array instead of throwing to continue with other makes
      return [];
    }
  }

  /**
   * Normalize make name for consistency
   */
  private normalizeMakeName(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Sync a single make from NHTSA data
   */
  private async syncMake(nhtsaMake: NhtsaMake): Promise<{ created: boolean; makeId: string }> {
    const normalizedName = this.normalizeMakeName(nhtsaMake.Make_Name);
    const slug = normalizeForSlug(normalizedName) || `make-${nhtsaMake.Make_ID}`;

    // Check if make already exists by slug or externalId
    const existing = await this.prisma.make.findFirst({
      where: {
        OR: [
          { slug },
          { externalId: String(nhtsaMake.Make_ID), externalSource: 'nhtsa' },
        ],
      },
    });

    if (existing) {
      // Update externalId and externalSource if missing
      if (!existing.externalId || existing.externalSource !== 'nhtsa') {
        await this.prisma.make.update({
          where: { id: existing.id },
          data: {
            externalId: String(nhtsaMake.Make_ID),
            externalSource: 'nhtsa',
            status: ReferenceStatus.verified,
          },
        });
        this.logger.debug(`Updated make ${normalizedName} with NHTSA data`);
      }
      return { created: false, makeId: existing.id };
    }

    // Check for potential duplicates using suggestion
    const suggestion = await this.makeModel.suggestMakeByName(normalizedName);
    if (suggestion.suggestions.length > 0) {
      const suggested = suggestion.suggestions[0];
      // Update the suggested make with NHTSA data
      await this.prisma.make.update({
        where: { id: suggested.id },
        data: {
          externalId: String(nhtsaMake.Make_ID),
          externalSource: 'nhtsa',
          status: ReferenceStatus.verified,
        },
      });
      this.logger.debug(`Matched make ${normalizedName} to existing ${suggested.name}`);
      return { created: false, makeId: suggested.id };
    }

    // Create new make
    const created = await this.prisma.make.create({
      data: {
        name: normalizedName,
        slug,
        externalId: String(nhtsaMake.Make_ID),
        externalSource: 'nhtsa',
        status: ReferenceStatus.verified,
      },
    });

    this.logger.debug(`Created make: ${normalizedName} (${slug})`);
    return { created: true, makeId: created.id };
  }

  /**
   * Sync models for a specific make
   */
  private async syncModelsForMake(makeId: string, nhtsaMakeId: number): Promise<{ created: number; updated: number }> {
    const nhtsaModels = await this.fetchModelsForMake(nhtsaMakeId);

    if (nhtsaModels.length === 0) {
      return { created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;

    for (const nhtsaModel of nhtsaModels) {
      try {
        const normalizedName = this.normalizeMakeName(nhtsaModel.Model_Name);
        const slug = normalizeForSlug(normalizedName) || `model-${nhtsaModel.Model_ID}`;

        // Check if model already exists
        const existing = await this.prisma.model.findUnique({
          where: {
            makeId_slug: { makeId, slug },
          },
        });

        if (existing) {
          // Update externalId and externalSource if missing
          if (!existing.externalId || existing.externalSource !== 'nhtsa') {
            await this.prisma.model.update({
              where: { id: existing.id },
              data: {
                externalId: String(nhtsaModel.Model_ID),
                externalSource: 'nhtsa',
                status: ReferenceStatus.verified,
              },
            });
            updated++;
          }
          continue;
        }

        // Check for potential duplicates
        const suggestion = await this.makeModel.suggestModelByName(makeId, normalizedName);
        if (suggestion.suggestions.length > 0) {
          const suggested = suggestion.suggestions[0];
          await this.prisma.model.update({
            where: { id: suggested.id },
            data: {
              externalId: String(nhtsaModel.Model_ID),
              externalSource: 'nhtsa',
              status: ReferenceStatus.verified,
            },
          });
          updated++;
          continue;
        }

        // Create new model
        await this.prisma.model.create({
          data: {
            makeId,
            name: normalizedName,
            slug,
            externalId: String(nhtsaModel.Model_ID),
            externalSource: 'nhtsa',
            status: ReferenceStatus.verified,
          },
        });
        created++;
      } catch (error) {
        this.logger.warn(`Error syncing model ${nhtsaModel.Model_Name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { created, updated };
  }

  /**
   * Sync all makes from NHTSA
   */
  async syncAllMakes(): Promise<{ processed: number; created: number; updated: number }> {
    const nhtsaMakes = await this.fetchAllMakes();
    let processed = 0;
    let created = 0;
    let updated = 0;

    this.logger.log(`Starting sync of ${nhtsaMakes.length} makes...`);

    for (const nhtsaMake of nhtsaMakes) {
      try {
        const result = await this.syncMake(nhtsaMake);
        processed++;
        if (result.created) {
          created++;
        } else {
          updated++;
        }

        // Log progress every 50 makes
        if (processed % 50 === 0) {
          this.logger.log(`Progress: ${processed}/${nhtsaMakes.length} makes processed`);
        }
      } catch (error) {
        this.logger.error(`Error syncing make ${nhtsaMake.Make_Name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.logger.log(`Makes sync completed: ${processed} processed, ${created} created, ${updated} updated`);
    return { processed, created, updated };
  }

  /**
   * Sync models for a specific make
   */
  async syncModelsForMakeId(nhtsaMakeId: number, makeId: string): Promise<{ created: number; updated: number }> {
    return this.syncModelsForMake(makeId, nhtsaMakeId);
  }

  /**
   * Sync all makes and their models from NHTSA
   */
  async syncAll(): Promise<SyncStats> {
    const stats: SyncStats = {
      makesProcessed: 0,
      makesCreated: 0,
      makesUpdated: 0,
      modelsProcessed: 0,
      modelsCreated: 0,
      modelsUpdated: 0,
      errors: [],
    };

    this.logger.log('Starting full NHTSA synchronization...');

    try {
      // Step 1: Sync all makes
      const makesResult = await this.syncAllMakes();
      stats.makesProcessed = makesResult.processed;
      stats.makesCreated = makesResult.created;
      stats.makesUpdated = makesResult.updated;

      // Step 2: Sync models for each make
      const makesWithNhtsaId = await this.prisma.make.findMany({
        where: {
          externalSource: 'nhtsa',
          externalId: { not: null },
        },
        select: {
          id: true,
          externalId: true,
          name: true,
        },
      });

      this.logger.log(`Syncing models for ${makesWithNhtsaId.length} makes...`);

      for (const make of makesWithNhtsaId) {
        if (!make.externalId) continue;

        try {
          const nhtsaMakeId = parseInt(make.externalId, 10);
          if (isNaN(nhtsaMakeId)) {
            this.logger.warn(`Invalid externalId for make ${make.name}: ${make.externalId}`);
            continue;
          }

          const modelsResult = await this.syncModelsForMake(make.id, nhtsaMakeId);
          stats.modelsCreated += modelsResult.created;
          stats.modelsUpdated += modelsResult.updated;
          stats.modelsProcessed += modelsResult.created + modelsResult.updated;

          // Log progress every 10 makes
          if (stats.modelsProcessed % 100 === 0) {
            this.logger.log(`Models progress: ${stats.modelsProcessed} models processed`);
          }
        } catch (error) {
          const errorMsg = `Error syncing models for make ${make.name}: ${error instanceof Error ? error.message : String(error)}`;
          this.logger.error(errorMsg);
          stats.errors.push(errorMsg);
        }
      }

      this.logger.log(
        `NHTSA sync completed: ${stats.makesProcessed} makes (${stats.makesCreated} created, ${stats.makesUpdated} updated), ${stats.modelsProcessed} models (${stats.modelsCreated} created, ${stats.modelsUpdated} updated)`,
      );
    } catch (error) {
      const errorMsg = `Fatal error during NHTSA sync: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMsg);
      stats.errors.push(errorMsg);
    }

    return stats;
  }
}
