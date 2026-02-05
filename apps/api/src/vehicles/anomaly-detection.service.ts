import { Injectable } from '@nestjs/common';

const TOP_SPEED_MIN = 80;
const TOP_SPEED_MAX = 350;
const ZERO_TO_100_MIN = 2;
const ZERO_TO_100_MAX = 25;
const POWER_KW_MIN = 30;
const POWER_KW_MAX = 800;

export interface AnomalyResult {
  inRange: boolean;
  needsReview: boolean;
  message?: string;
}

export interface SpecAnomalyResults {
  topSpeedKmh?: AnomalyResult;
  zeroTo100S?: AnomalyResult;
  powerKw?: AnomalyResult;
}

@Injectable()
export class AnomalyDetectionService {
  checkTopSpeedKmh(value: number | null | undefined): AnomalyResult | null {
    if (value == null) return null;
    const inRange = value >= TOP_SPEED_MIN && value <= TOP_SPEED_MAX;
    return {
      inRange,
      needsReview: !inRange,
      message: inRange ? undefined : `Top speed should be between ${TOP_SPEED_MIN} and ${TOP_SPEED_MAX} km/h`,
    };
  }

  checkZeroTo100S(value: number | null | undefined): AnomalyResult | null {
    if (value == null) return null;
    const inRange = value >= ZERO_TO_100_MIN && value <= ZERO_TO_100_MAX;
    return {
      inRange,
      needsReview: !inRange,
      message: inRange ? undefined : `0-100 km/h should be between ${ZERO_TO_100_MIN} and ${ZERO_TO_100_MAX} seconds`,
    };
  }

  checkPowerKw(value: number | null | undefined): AnomalyResult | null {
    if (value == null) return null;
    const inRange = value >= POWER_KW_MIN && value <= POWER_KW_MAX;
    return {
      inRange,
      needsReview: !inRange,
      message: inRange ? undefined : `Power should be between ${POWER_KW_MIN} and ${POWER_KW_MAX} kW`,
    };
  }

  checkAll(specs: {
    topSpeedKmh?: number | null;
    zeroTo100S?: number | null;
    powerKw?: number | null;
  }): SpecAnomalyResults {
    const result: SpecAnomalyResults = {};
    const t = this.checkTopSpeedKmh(specs.topSpeedKmh);
    if (t) result.topSpeedKmh = t;
    const z = this.checkZeroTo100S(specs.zeroTo100S);
    if (z) result.zeroTo100S = z;
    const p = this.checkPowerKw(specs.powerKw);
    if (p) result.powerKw = p;
    return result;
  }
}
