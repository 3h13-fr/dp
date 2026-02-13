/**
 * Interface for VIN specification providers (e.g., NHTSA, CarMD, etc.)
 * Providers fetch vehicle specifications from external APIs based on VIN.
 */
export interface VinSpecsResult {
  makeName?: string;
  makeId?: string; // If already resolved by provider
  modelName?: string;
  modelId?: string; // If already resolved by provider
  modelYear?: number;
  trimLabel?: string;
  fuelType?: string; // Will be mapped to FuelType enum
  transmissionType?: string; // Will be mapped to TransmissionType enum
  driveType?: string; // Will be mapped to DriveType enum
  powerKw?: number;
  topSpeedKmh?: number;
  zeroTo100S?: number;
  confidence?: number; // 0-1, default 0.85 for system sources
}

export interface SpecProvider {
  /**
   * Fetch vehicle specifications by VIN.
   * Returns null if VIN not found, API error, or provider not configured.
   */
  getSpecsByVin(vin: string): Promise<VinSpecsResult | null>;
}

/**
 * NHTSA API response structure
 * Based on: https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json
 */
export interface NhtsaDecodeResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: Array<{
    Variable: string;
    Value: string | null;
    ValueId?: string;
    VariableId: number;
  }>;
}
