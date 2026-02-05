import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [VehiclesModule, KycModule],
  providers: [ListingsService],
  controllers: [ListingsController],
  exports: [ListingsService],
})
export class ListingsModule {}
