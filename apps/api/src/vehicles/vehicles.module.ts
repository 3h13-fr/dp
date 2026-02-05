import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VinValidationService } from './vin-validation.service';
import { MakeModelService } from './make-model.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { VehicleSpecService } from './vehicle-spec.service';
import { VehicleDisplayService } from './vehicle-display.service';
import { VehicleService } from './vehicle.service';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VehiclesController],
  providers: [
    VinValidationService,
    MakeModelService,
    AnomalyDetectionService,
    VehicleSpecService,
    VehicleDisplayService,
    VehicleService,
  ],
  exports: [
    VinValidationService,
    MakeModelService,
    VehicleService,
    VehicleDisplayService,
    VehicleSpecService,
    AnomalyDetectionService,
  ],
})
export class VehiclesModule {}
