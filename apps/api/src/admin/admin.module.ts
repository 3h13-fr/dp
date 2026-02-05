import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [KycModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
