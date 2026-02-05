import { Injectable } from '@nestjs/common';

const VIN_LENGTH = 17;
const FORBIDDEN_CHARS = /[IOQ]/i;

export interface VinValidationResult {
  valid: boolean;
  error?: string;
  wmi?: string;
}

@Injectable()
export class VinValidationService {
  /**
   * Validate VIN format: 17 chars, exclude I/O/Q.
   * Optional: ISO 3779 checksum (can be added later).
   */
  validateFormat(vin: string): VinValidationResult {
    if (!vin || typeof vin !== 'string') {
      return { valid: false, error: 'VIN is required' };
    }
    const trimmed = vin.trim().toUpperCase();
    if (trimmed.length !== VIN_LENGTH) {
      return {
        valid: false,
        error: `VIN must be exactly ${VIN_LENGTH} characters`,
      };
    }
    if (FORBIDDEN_CHARS.test(trimmed)) {
      return {
        valid: false,
        error: 'VIN cannot contain letters I, O or Q',
      };
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(trimmed)) {
      return {
        valid: false,
        error: 'VIN must contain only valid characters (A-Z except I,O,Q and 0-9)',
      };
    }
    return {
      valid: true,
      wmi: trimmed.slice(0, 3),
    };
  }
}
