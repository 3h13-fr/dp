import { Module } from '@nestjs/common';
import { InspectionController } from './inspection.controller';
import { InspectionService } from './inspection.service';
import { InspectionWorkflowProcessor } from './inspection-workflow.processor';
import { InspectionScoringService } from './inspection-scoring.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [InspectionController],
  providers: [InspectionService, InspectionWorkflowProcessor, InspectionScoringService],
  exports: [InspectionService, InspectionScoringService],
})
export class InspectionModule {}
