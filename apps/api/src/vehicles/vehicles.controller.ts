import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'database';
import type { User } from 'database';
import { VinValidationService } from './vin-validation.service';
import { MakeModelService } from './make-model.service';
import { VehicleService } from './vehicle.service';
import { VinSpecsService } from './vin-specs.service';
import { NhtsaSyncService } from './nhtsa-sync.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private vinValidation: VinValidationService,
    private makeModel: MakeModelService,
    private vehicle: VehicleService,
    private vinSpecs: VinSpecsService,
    private nhtsaSync: NhtsaSyncService,
  ) {}

  @Post('onboarding/validate-vin')
  validateVin(@Body() body: { vin: string }) {
    return this.vinValidation.validateFormat(body.vin ?? '');
  }

  @Post('onboarding/fetch-vin-specs')
  async fetchVinSpecs(@Body() body: { vin: string }) {
    const result = await this.vinSpecs.fetchSpecsByVin(body.vin ?? '');
    // Return null if no specs found (graceful fallback to manual entry)
    return result || null;
  }

  @Post('onboarding/suggest-make')
  async suggestMake(@Body() body: { name: string }) {
    const result = await this.makeModel.suggestMakeByName(body.name ?? '');
    return result;
  }

  @Post('onboarding/suggest-model')
  async suggestModel(@Body() body: { makeId: string; name: string }) {
    const result = await this.makeModel.suggestModelByName(body.makeId ?? '', body.name ?? '');
    return result;
  }

  @Post('onboarding/create-make-unverified')
  async createMakeUnverified(@Body() body: { name: string }) {
    const created = await this.makeModel.createMakeUnverified(body.name ?? '');
    return { created };
  }

  @Post('onboarding/create-model-unverified')
  async createModelUnverified(@Body() body: { makeId: string; name: string }) {
    const created = await this.makeModel.createModelUnverified(body.makeId ?? '', body.name ?? '');
    return { created };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('onboarding/vehicle')
  async createVehicle(@Body() body: { vin: string; makeId: string; modelId: string; modelYear: number; trimLabel?: string }) {
    return this.vehicle.create({
      vin: body.vin,
      makeId: body.makeId,
      modelId: body.modelId,
      modelYear: body.modelYear,
      trimLabel: body.trimLabel,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('onboarding/confirm-specs')
  async confirmSpecs(
    @Body() body: {
      vehicleId: string;
      fuelType?: string;
      transmissionType?: string;
      driveType?: string;
      topSpeedKmh?: number;
      zeroTo100S?: number;
      powerKw?: number;
      source?: string;
    },
    @CurrentUser() user?: User,
  ) {
    await this.vehicle.confirmSpecs({
      vehicleId: body.vehicleId,
      fuelType: body.fuelType as never,
      transmissionType: body.transmissionType as never,
      driveType: body.driveType as never,
      topSpeedKmh: body.topSpeedKmh,
      zeroTo100S: body.zeroTo100S,
      powerKw: body.powerKw,
      source: body.source as never,
      userId: user?.id,
    });
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/performance-specs')
  async updatePerformanceSpecs(
    @Param('id') id: string,
    @Body() body: {
      powerKw?: number | null;
      powerCv?: number | null;
      batteryKwh?: number | null;
      topSpeedKmh?: number | null;
      zeroTo100S?: number | null;
    },
    @CurrentUser() user?: User,
  ) {
    return this.vehicle.updatePerformanceSpecs(id, body, user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/admin-info')
  async updateAdminInfo(
    @Param('id') id: string,
    @Body() body: {
      registrationCountry?: string | null;
      licensePlate?: string | null;
      fiscalPower?: number | null;
      ownerType?: 'PARTICULAR' | 'PROFESSIONAL' | null;
    },
  ) {
    return this.vehicle.updateAdminInfo(id, body);
  }

  @Get('makes')
  async listMakes(@Query('q') q?: string) {
    const makes = await this.makeModel.listMakes(q);
    return { items: makes };
  }

  @Get('makes/:makeId/models')
  async listModels(@Param('makeId') makeId: string) {
    const models = await this.makeModel.listModelsByMake(makeId);
    return { items: models };
  }

  @Get(':id')
  async getVehicle(@Param('id') id: string) {
    return this.vehicle.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/sync-nhtsa')
  async syncNhtsa() {
    const stats = await this.nhtsaSync.syncAll();
    return {
      success: true,
      stats,
      message: 'NHTSA synchronization completed',
    };
  }
}
