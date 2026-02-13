import { Module } from '@nestjs/common';
import { DamageClaimController } from './damage-claim.controller';
import { DamageClaimService } from './damage-claim.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InspectionModule } from '../inspection/inspection.module';

@Module({
  imports: [PrismaModule, InspectionModule],
  controllers: [DamageClaimController],
  providers: [DamageClaimService],
  exports: [DamageClaimService],
})
export class DamageClaimModule {}
