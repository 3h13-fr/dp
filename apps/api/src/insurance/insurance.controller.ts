import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InsuranceService } from './insurance.service';

@Controller('insurance')
export class InsuranceController {
  constructor(private insurance: InsuranceService) {}

  @Get('policies')
  @UseGuards(AuthGuard('jwt'))
  listPolicies() {
    return this.insurance.listPoliciesForSelection();
  }
}
