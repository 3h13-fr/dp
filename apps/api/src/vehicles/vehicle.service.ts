import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FuelType, TransmissionType, DriveType, SpecSource } from 'database';
import { VinValidationService } from './vin-validation.service';
import { VehicleDisplayService } from './vehicle-display.service';
import { VehicleSpecService, SpecKey } from './vehicle-spec.service';

export interface CreateVehicleInput {
  vin: string;
  makeId: string;
  modelId: string;
  modelYear: number;
  trimLabel?: string | null;
}

export interface ConfirmSpecsInput {
  vehicleId: string;
  fuelType?: FuelType | null;
  transmissionType?: TransmissionType | null;
  driveType?: DriveType | null;
  topSpeedKmh?: number | null;
  zeroTo100S?: number | null;
  powerKw?: number | null;
  source?: SpecSource;
  userId?: string | null;
}

@Injectable()
export class VehicleService {
  constructor(
    private prisma: PrismaService,
    private vinValidation: VinValidationService,
    private vehicleDisplay: VehicleDisplayService,
    private vehicleSpec: VehicleSpecService,
  ) {}

  async create(data: CreateVehicleInput) {
    const validation = this.vinValidation.validateFormat(data.vin);
    if (!validation.valid) {
      throw new ConflictException(validation.error);
    }
    const vinUpper = data.vin.trim().toUpperCase();
    const existing = await this.prisma.vehicle.findUnique({
      where: { vin: vinUpper },
    });
    if (existing) {
      throw new ConflictException('A vehicle with this VIN already exists');
    }
    const make = await this.prisma.make.findUnique({ where: { id: data.makeId } });
    const model = await this.prisma.model.findUnique({
      where: { id: data.modelId },
      include: { make: true },
    });
    if (!make || !model || model.makeId !== data.makeId) {
      throw new ConflictException('Invalid make or model');
    }
    const vehicle = await this.prisma.vehicle.create({
      data: {
        vin: vinUpper,
        makeId: data.makeId,
        modelId: data.modelId,
        modelYear: data.modelYear,
        trimLabel: data.trimLabel?.trim() || null,
      },
      include: {
        make: true,
        model: true,
      },
    });
    return vehicle;
  }

  async findById(id: string) {
    return this.prisma.vehicle.findUnique({
      where: { id },
      include: { make: true, model: true },
    });
  }

  async confirmSpecs(input: ConfirmSpecsInput): Promise<void> {
    const source = input.source ?? SpecSource.host_confirmed;
    const specs: Array<{ key: SpecKey; value: string | number | null }> = [];
    if (input.fuelType !== undefined) specs.push({ key: 'fuel_type', value: input.fuelType });
    if (input.transmissionType !== undefined) specs.push({ key: 'transmission_type', value: input.transmissionType });
    if (input.driveType !== undefined) specs.push({ key: 'drive_type', value: input.driveType });
    if (input.topSpeedKmh !== undefined) specs.push({ key: 'top_speed_kmh', value: input.topSpeedKmh });
    if (input.zeroTo100S !== undefined) specs.push({ key: 'zero_to_100_s', value: input.zeroTo100S });
    if (input.powerKw !== undefined) specs.push({ key: 'power_kw', value: input.powerKw });
    for (const s of specs) {
      await this.vehicleSpec.upsertSpec({
        vehicleId: input.vehicleId,
        key: s.key,
        value: s.value,
        source,
        userId: input.userId,
      });
    }
  }

  getCanonicalDisplayName(vehicle: { make: { name: string; slug: string }; model: { name: string; slug: string }; modelYear: number; trimLabel: string | null }) {
    return this.vehicleDisplay.canonicalDisplayName(vehicle as never);
  }

  getCanonicalSlugComponents(vehicle: { make: { slug: string }; model: { slug: string }; modelYear: number; trimLabel: string | null }) {
    return this.vehicleDisplay.canonicalSlugComponents(vehicle as never);
  }

  listingSlugFromVehicle(vehicle: { make: { slug: string }; model: { slug: string }; modelYear: number; trimLabel: string | null }, suffix: string) {
    return this.vehicleDisplay.listingSlugFromVehicle(vehicle as never, suffix);
  }
}
