import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpecProvider, VinSpecsResult, NhtsaDecodeResponse } from './spec-provider.interface';

const NHTSA_API_BASE = 'https://vpic.nhtsa.dot.gov/api';

@Injectable()
export class NhtsaSpecProvider implements SpecProvider {
  private readonly logger = new Logger(NhtsaSpecProvider.name);
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    // Enable by default, can be disabled via VIN_API_ENABLED=false
    this.enabled = this.config.get<string>('VIN_API_ENABLED', 'true') === 'true';
  }

  async getSpecsByVin(vin: string): Promise<VinSpecsResult | null> {
    if (!this.enabled) {
      this.logger.debug('NHTSA provider disabled via VIN_API_ENABLED');
      return null;
    }

    if (!vin || vin.trim().length !== 17) {
      this.logger.debug(`Invalid VIN format: ${vin}`);
      return null;
    }

    const cleanVin = vin.trim().toUpperCase();
    const url = `${NHTSA_API_BASE}/vehicles/DecodeVinValues/${cleanVin}?format=json`;

    try {
      this.logger.debug(`Fetching NHTSA data for VIN: ${cleanVin}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        // 10 second timeout
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.warn(`NHTSA API returned ${response.status} for VIN ${cleanVin}`);
        return null;
      }

      const data: NhtsaDecodeResponse = await response.json();

      if (!data.Results || data.Results.length === 0) {
        this.logger.debug(`No results from NHTSA for VIN ${cleanVin}`);
        return null;
      }

      // Convert array of {Variable, Value} to a map for easier lookup
      const valueMap = new Map<string, string>();
      for (const result of data.Results) {
        if (result.Value && result.Value !== 'Not Applicable' && result.Value !== '') {
          valueMap.set(result.Variable, result.Value);
        }
      }

      // Check if VIN was actually decoded (ErrorCode should be empty or "0")
      const errorCode = valueMap.get('ErrorCode');
      if (errorCode && errorCode !== '0' && errorCode !== '') {
        this.logger.debug(`NHTSA returned error code ${errorCode} for VIN ${cleanVin}`);
        return null;
      }

      // Try to extract power, speed, and acceleration if available
      const powerKw = this.parsePowerKw(valueMap);
      const topSpeedKmh = this.parseTopSpeed(valueMap);
      const zeroTo100S = this.parseZeroTo100(valueMap);

      const specs: VinSpecsResult = {
        makeName: valueMap.get('Make') || undefined,
        modelName: valueMap.get('Model') || undefined,
        modelYear: this.parseYear(valueMap.get('ModelYear')),
        trimLabel: valueMap.get('Trim') || valueMap.get('Series') || undefined,
        fuelType: this.mapFuelType(valueMap.get('Fuel Type - Primary')),
        transmissionType: this.mapTransmissionType(valueMap.get('TransmissionStyle')),
        driveType: this.mapDriveType(valueMap.get('DriveType')),
        powerKw,
        topSpeedKmh,
        zeroTo100S,
        confidence: 0.85, // System source confidence
      };

      // Only return if we have at least make/model/year
      if (!specs.makeName || !specs.modelName || !specs.modelYear) {
        this.logger.debug(`Incomplete NHTSA data for VIN ${cleanVin}: missing make/model/year`);
        return null;
      }

      this.logger.log(`Successfully fetched NHTSA data for VIN ${cleanVin}: ${specs.makeName} ${specs.modelName} ${specs.modelYear}`);
      return specs;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn(`NHTSA API timeout for VIN ${cleanVin}`);
      } else {
        this.logger.error(`Error fetching NHTSA data for VIN ${cleanVin}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return null;
    }
  }

  private parseYear(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const year = parseInt(value, 10);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      return undefined;
    }
    return year;
  }

  private mapFuelType(nhtsaValue: string | undefined): string | undefined {
    if (!nhtsaValue) return undefined;
    const normalized = nhtsaValue.toLowerCase().trim();

    // Mapping NHTSA fuel types to our FuelType enum
    if (normalized.includes('gasoline') || normalized.includes('gas')) {
      return 'petrol';
    }
    if (normalized.includes('diesel')) {
      return 'diesel';
    }
    if (normalized.includes('electric')) {
      return 'electric';
    }
    if (normalized.includes('hybrid')) {
      return 'hybrid';
    }
    if (normalized.includes('lpg') || normalized.includes('propane')) {
      return 'lpg';
    }
    // Default to 'other' if we can't map it
    return 'other';
  }

  private mapTransmissionType(nhtsaValue: string | undefined): string | undefined {
    if (!nhtsaValue) return undefined;
    const normalized = nhtsaValue.toLowerCase().trim();

    // Mapping NHTSA transmission types to our TransmissionType enum
    // Check semi-automatic BEFORE automatic (since "semi-automatic" contains "automatic")
    if (normalized.includes('semi') || normalized.includes('semi-automatic')) {
      return 'semi_automatic';
    }
    if (normalized.includes('manual')) {
      return 'manual';
    }
    if (normalized.includes('automatic')) {
      return 'automatic';
    }
    if (normalized.includes('cvt')) {
      return 'cvt';
    }
    // Default to 'other' if we can't map it
    return 'other';
  }

  private mapDriveType(nhtsaValue: string | undefined): string | undefined {
    if (!nhtsaValue) return undefined;
    const normalized = nhtsaValue.toUpperCase().trim();

    // Mapping NHTSA drive types to our DriveType enum
    if (normalized === 'FWD' || normalized.includes('FRONT')) {
      return 'fwd';
    }
    if (normalized === 'RWD' || normalized.includes('REAR')) {
      return 'rwd';
    }
    if (normalized === 'AWD' || normalized === '4WD' || normalized.includes('ALL')) {
      return 'awd';
    }
    // Default to 'other' if we can't map it
    return 'other';
  }

  private parsePowerKw(valueMap: Map<string, string>): number | undefined {
    // Try various NHTSA fields that might contain power information
    // Note: NHTSA doesn't typically provide engine power, but we'll try common fields
    const powerStr = valueMap.get('Engine Power (kW)') || 
                     valueMap.get('Engine Power') ||
                     valueMap.get('Power') ||
                     valueMap.get('EngineKW');
    
    if (!powerStr) return undefined;
    
    // Extract number from string (handle formats like "150 kW", "150kW", "150")
    const match = powerStr.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0 && value < 2000) {
        return value;
      }
    }
    return undefined;
  }

  private parseTopSpeed(valueMap: Map<string, string>): number | undefined {
    // Try various NHTSA fields that might contain top speed
    // Note: NHTSA typically doesn't provide top speed, but we'll try
    const speedStr = valueMap.get('Top Speed (km/h)') ||
                     valueMap.get('Top Speed') ||
                     valueMap.get('Maximum Speed');
    
    if (!speedStr) return undefined;
    
    const match = speedStr.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value) && value > 0 && value < 500) {
        return value;
      }
    }
    return undefined;
  }

  private parseZeroTo100(valueMap: Map<string, string>): number | undefined {
    // Try various NHTSA fields that might contain acceleration
    // Note: NHTSA typically doesn't provide acceleration, but we'll try
    const accelStr = valueMap.get('0-100 km/h (s)') ||
                     valueMap.get('0-100 km/h') ||
                     valueMap.get('Acceleration 0-100') ||
                     valueMap.get('0-60 mph (s)');
    
    if (!accelStr) return undefined;
    
    const match = accelStr.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0 && value < 30) {
        return value;
      }
    }
    return undefined;
  }
}
