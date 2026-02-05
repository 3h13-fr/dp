import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { OcrSpaceService } from './ocr-space.service';

@Module({
  imports: [PrismaModule],
  controllers: [KycController],
  providers: [KycService, OcrSpaceService],
  exports: [KycService],
})
export class KycModule {}
