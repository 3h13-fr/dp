import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { VinValidationService } from './vin-validation.service';
import { MakeModelService } from './make-model.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { VehicleSpecService } from './vehicle-spec.service';
import { VehicleDisplayService } from './vehicle-display.service';
import { VehicleService } from './vehicle.service';
import { VehiclesController } from './vehicles.controller';
import { NhtsaSpecProvider } from './nhtsa-spec-provider.service';
import { VinSpecsService } from './vin-specs.service';
import { NhtsaSyncModule } from './nhtsa-sync.module';

@Module({
  imports: [PrismaModule, ConfigModule, NhtsaSyncModule],
  controllers: [VehiclesController],
  providers: [
    VinValidationService,
    MakeModelService,
    AnomalyDetectionService,
    VehicleSpecService,
    VehicleDisplayService,
    VehicleService,
    NhtsaSpecProvider,
    VinSpecsService,
  ],
  exports: [
    VinValidationService,
    MakeModelService,
    VehicleService,
    VehicleDisplayService,
    VehicleSpecService,
    AnomalyDetectionService,
    VinSpecsService,
  ],
})
export class VehiclesModule {}
