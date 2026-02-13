import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { KycModule } from '../kyc/kyc.module';
import { MarketsModule } from '../markets/markets.module';

@Module({
  imports: [VehiclesModule, KycModule, MarketsModule],
  providers: [ListingsService],
  controllers: [ListingsController],
  exports: [ListingsService],
})
export class ListingsModule {}
