import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpecSource } from 'database';
import { AnomalyDetectionService } from './anomaly-detection.service';

const CONFIDENCE_HOST_CONFIRMED = 0.95;
const CONFIDENCE_HOST_MANUAL = 0.7;
const CONFIDENCE_SYSTEM = 0.85;

export type SpecKey = 'fuel_type' | 'transmission_type' | 'drive_type' | 'top_speed_kmh' | 'zero_to_100_s' | 'power_kw';

export interface UpsertSpecInput {
  vehicleId: string;
  key: SpecKey;
  value: string | number | null;
  source: SpecSource;
  userId?: string | null;
}

@Injectable()
export class VehicleSpecService {
  constructor(
    private prisma: PrismaService,
    private anomaly: AnomalyDetectionService,
  ) {}

  private confidenceForSource(source: SpecSource): number {
    switch (source) {
      case SpecSource.host_confirmed:
        return CONFIDENCE_HOST_CONFIRMED;
      case SpecSource.host_manual:
        return CONFIDENCE_HOST_MANUAL;
      case SpecSource.system:
      default:
        return CONFIDENCE_SYSTEM;
    }
  }

  async upsertSpec(input: UpsertSpecInput): Promise<void> {
    const { vehicleId, key, value, source, userId } = input;
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new Error('Vehicle not found');

    const now = new Date();
    let needsReview = false;
    let confidence = this.confidenceForSource(source);

    if (key === 'top_speed_kmh' && typeof value === 'number') {
      const result = this.anomaly.checkTopSpeedKmh(value);
      if (result?.needsReview) needsReview = true;
    } else if (key === 'zero_to_100_s' && typeof value === 'number') {
      const result = this.anomaly.checkZeroTo100S(value);
      if (result?.needsReview) needsReview = true;
    } else if (key === 'power_kw' && typeof value === 'number') {
      const result = this.anomaly.checkPowerKw(value);
      if (result?.needsReview) needsReview = true;
    }
    if (needsReview) confidence = Math.min(confidence, 0.5);

    const oldValue = this.getVehicleValue(vehicle, key);
    const newValueStr = value != null ? String(value) : null;

    await this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (key === 'fuel_type') updateData.fuelType = value;
      else if (key === 'transmission_type') updateData.transmissionType = value;
      else if (key === 'drive_type') updateData.driveType = value;
      else if (key === 'top_speed_kmh') updateData.topSpeedKmh = value;
      else if (key === 'zero_to_100_s') updateData.zeroTo100S = value;
      else if (key === 'power_kw') updateData.powerKw = value;

      await tx.vehicle.update({
        where: { id: vehicleId },
        data: updateData as never,
      });

      await tx.vehicleSpecMeta.upsert({
        where: { vehicleId_specKey: { vehicleId, specKey: key } },
        create: {
          vehicleId,
          specKey: key,
          source,
          confidence,
          needsReview,
          updatedAt: now,
        },
        update: {
          source,
          confidence,
          needsReview,
          updatedAt: now,
        },
      });

      if (oldValue !== newValueStr) {
        await tx.vehicleFieldAudit.create({
          data: {
            vehicleId,
            fieldName: key,
            oldValue: oldValue ?? undefined,
            newValue: newValueStr ?? undefined,
            source,
            userId: userId ?? undefined,
          },
        });
      }
    });
  }

  private getVehicleValue(
    vehicle: { fuelType?: string | null; transmissionType?: string | null; driveType?: string | null; topSpeedKmh?: number | null; zeroTo100S?: unknown; powerKw?: unknown },
    key: SpecKey,
  ): string | null {
    switch (key) {
      case 'fuel_type':
        return vehicle.fuelType ?? null;
      case 'transmission_type':
        return vehicle.transmissionType ?? null;
      case 'drive_type':
        return vehicle.driveType ?? null;
      case 'top_speed_kmh':
        return vehicle.topSpeedKmh != null ? String(vehicle.topSpeedKmh) : null;
      case 'zero_to_100_s':
        return vehicle.zeroTo100S != null ? String(vehicle.zeroTo100S) : null;
      case 'power_kw':
        return vehicle.powerKw != null ? String(vehicle.powerKw) : null;
      default:
        return null;
    }
  }
}
