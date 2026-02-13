import { Injectable, Logger } from '@nestjs/common';
import { VinValidationService } from './vin-validation.service';
import { MakeModelService } from './make-model.service';
import { NhtsaSpecProvider } from './nhtsa-spec-provider.service';
import { VinSpecsResult } from './spec-provider.interface';

export interface FetchVinSpecsResult {
  makeId?: string;
  modelId?: string;
  modelYear?: number;
  trimLabel?: string;
  makeName?: string;
  modelName?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  powerKw?: number;
  topSpeedKmh?: number;
  zeroTo100S?: number;
  confidence?: number;
  source?: 'nhtsa' | null;
}

@Injectable()
export class VinSpecsService {
  private readonly logger = new Logger(VinSpecsService.name);

  constructor(
    private vinValidation: VinValidationService,
    private makeModel: MakeModelService,
    private nhtsaProvider: NhtsaSpecProvider,
  ) {}

  /**
   * Fetch vehicle specifications by VIN using external providers.
   * Returns null if VIN is invalid, provider fails, or no data found.
   */
  async fetchSpecsByVin(vin: string): Promise<FetchVinSpecsResult | null> {
    // Step 1: Validate VIN format
    const validation = this.vinValidation.validateFormat(vin);
    if (!validation.valid) {
      this.logger.debug(`Invalid VIN format: ${vin} - ${validation.error}`);
      return null;
    }

    const cleanVin = vin.trim().toUpperCase();

    // Step 2: Try NHTSA provider
    let specs: VinSpecsResult | null = null;
    try {
      specs = await this.nhtsaProvider.getSpecsByVin(cleanVin);
    } catch (error) {
      this.logger.warn(`Error calling NHTSA provider for VIN ${cleanVin}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!specs || !specs.makeName || !specs.modelName || !specs.modelYear) {
      this.logger.debug(`No specs found from providers for VIN ${cleanVin}`);
      return null;
    }

    // Step 3: Resolve or create Make
    let makeId: string | undefined;
    try {
      const makeSuggestion = await this.makeModel.suggestMakeByName(specs.makeName);
      if (makeSuggestion.suggestions.length > 0) {
        makeId = makeSuggestion.suggestions[0].id;
        this.logger.debug(`Resolved make "${specs.makeName}" to ID ${makeId}`);
      } else {
        // Create unverified make if not found
        const created = await this.makeModel.createMakeUnverified(specs.makeName);
        makeId = created.id;
        this.logger.log(`Created unverified make "${specs.makeName}" with ID ${makeId}`);
      }
    } catch (error) {
      this.logger.error(`Error resolving make "${specs.makeName}": ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }

    if (!makeId) {
      this.logger.warn(`Could not resolve or create make for "${specs.makeName}"`);
      return null;
    }

    // Step 4: Resolve or create Model
    let modelId: string | undefined;
    try {
      const modelSuggestion = await this.makeModel.suggestModelByName(makeId, specs.modelName);
      if (modelSuggestion.suggestions.length > 0) {
        modelId = modelSuggestion.suggestions[0].id;
        this.logger.debug(`Resolved model "${specs.modelName}" to ID ${modelId}`);
      } else {
        // Create unverified model if not found
        const created = await this.makeModel.createModelUnverified(makeId, specs.modelName);
        modelId = created.id;
        this.logger.log(`Created unverified model "${specs.modelName}" with ID ${modelId}`);
      }
    } catch (error) {
      this.logger.error(`Error resolving model "${specs.modelName}": ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }

    if (!modelId) {
      this.logger.warn(`Could not resolve or create model for "${specs.modelName}"`);
      return null;
    }

    // Step 5: Build result with resolved IDs
    const result: FetchVinSpecsResult = {
      makeId,
      modelId,
      modelYear: specs.modelYear,
      trimLabel: specs.trimLabel,
      makeName: specs.makeName,
      modelName: specs.modelName,
      fuelType: specs.fuelType,
      transmissionType: specs.transmissionType,
      driveType: specs.driveType,
      powerKw: specs.powerKw,
      topSpeedKmh: specs.topSpeedKmh,
      zeroTo100S: specs.zeroTo100S,
      confidence: specs.confidence ?? 0.85,
      source: 'nhtsa',
    };

    this.logger.log(`Successfully fetched and resolved specs for VIN ${cleanVin}: ${specs.makeName} ${specs.modelName} ${specs.modelYear}`);
    return result;
  }
}
