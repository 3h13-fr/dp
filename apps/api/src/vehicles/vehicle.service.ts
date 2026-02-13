import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FuelType, TransmissionType, DriveType, SpecSource, OwnerType } from 'database';
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

  async updatePerformanceSpecs(
    vehicleId: string,
    data: {
      powerKw?: number | null;
      powerCv?: number | null;
      batteryKwh?: number | null;
      topSpeedKmh?: number | null;
      zeroTo100S?: number | null;
    },
    userId?: string | null,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updateData: Record<string, unknown> = {};
    if (data.powerKw !== undefined) updateData.powerKw = data.powerKw;
    if (data.powerCv !== undefined) updateData.powerCv = data.powerCv;
    if (data.batteryKwh !== undefined) updateData.batteryKwh = data.batteryKwh;
    if (data.topSpeedKmh !== undefined) updateData.topSpeedKmh = data.topSpeedKmh;
    if (data.zeroTo100S !== undefined) updateData.zeroTo100S = data.zeroTo100S;

    // Update vehicle fields
    if (Object.keys(updateData).length > 0) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: updateData as never,
      });
    }

    // Update spec metadata
    const source = SpecSource.host_confirmed;
    if (data.powerKw !== undefined) {
      await this.vehicleSpec.upsertSpec({
        vehicleId,
        key: 'power_kw',
        value: data.powerKw,
        source,
        userId,
      });
    }
    if (data.topSpeedKmh !== undefined) {
      await this.vehicleSpec.upsertSpec({
        vehicleId,
        key: 'top_speed_kmh',
        value: data.topSpeedKmh,
        source,
        userId,
      });
    }
    if (data.zeroTo100S !== undefined) {
      await this.vehicleSpec.upsertSpec({
        vehicleId,
        key: 'zero_to_100_s',
        value: data.zeroTo100S,
        source,
        userId,
      });
    }

    return this.findById(vehicleId);
  }

  async updateAdminInfo(
    vehicleId: string,
    data: {
      registrationCountry?: string | null;
      licensePlate?: string | null;
      fiscalPower?: number | null;
      ownerType?: OwnerType | null;
    },
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updateData: Record<string, unknown> = {};
    if (data.registrationCountry !== undefined) updateData.registrationCountry = data.registrationCountry;
    if (data.licensePlate !== undefined) updateData.licensePlate = data.licensePlate;
    if (data.fiscalPower !== undefined) updateData.fiscalPower = data.fiscalPower;
    if (data.ownerType !== undefined) updateData.ownerType = data.ownerType;

    if (Object.keys(updateData).length === 0) return vehicle;

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData as never,
      include: { make: true, model: true },
    });
  }

  async updateVehicleSpecsAndAdmin(
    vehicleId: string,
    data: {
      powerCv?: number | null;
      batteryKwh?: number | null;
      topSpeedKmh?: number | null;
      zeroTo100S?: number | null;
      powerKw?: number | null;
      registrationCountry?: string | null;
      licensePlate?: string | null;
      fiscalPower?: number | null;
      ownerType?: OwnerType | null;
    },
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updateData: Record<string, unknown> = {};
    if (data.powerCv !== undefined) updateData.powerCv = data.powerCv;
    if (data.batteryKwh !== undefined) updateData.batteryKwh = data.batteryKwh;
    if (data.topSpeedKmh !== undefined) updateData.topSpeedKmh = data.topSpeedKmh;
    if (data.zeroTo100S !== undefined) updateData.zeroTo100S = data.zeroTo100S;
    if (data.powerKw !== undefined) updateData.powerKw = data.powerKw;
    if (data.registrationCountry !== undefined) updateData.registrationCountry = data.registrationCountry;
    if (data.licensePlate !== undefined) updateData.licensePlate = data.licensePlate;
    if (data.fiscalPower !== undefined) updateData.fiscalPower = data.fiscalPower;
    if (data.ownerType !== undefined) updateData.ownerType = data.ownerType;

    if (Object.keys(updateData).length === 0) return vehicle;

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData as never,
      include: { make: true, model: true },
    });
  }
}
