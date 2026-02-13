import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'database';
import { AdminInsuranceService, type EligibilityCriteria, type PolicyDetails } from './admin-insurance.service';

@Controller('admin/insurance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminInsuranceController {
  constructor(private insurance: AdminInsuranceService) {}

  @Get('insurers')
  getInsurers() {
    return this.insurance.getInsurers();
  }

  @Get('insurers/:id')
  getInsurerById(@Param('id') id: string) {
    return this.insurance.getInsurerById(id);
  }

  @Post('insurers')
  createInsurer(@Body() body: { name: string; status?: string }) {
    return this.insurance.createInsurer(body);
  }

  @Patch('insurers/:id')
  updateInsurer(@Param('id') id: string, @Body() body: { name?: string; status?: string }) {
    return this.insurance.updateInsurer(id, body);
  }

  @Delete('insurers/:id')
  deleteInsurer(@Param('id') id: string) {
    return this.insurance.deleteInsurer(id);
  }

  @Get('insurers/:insurerId/policies')
  getPolicies(@Param('insurerId') insurerId: string) {
    return this.insurance.getPolicies(insurerId);
  }

  @Get('policies/:id')
  getPolicyById(@Param('id') id: string) {
    return this.insurance.getPolicyById(id);
  }

  @Post('insurers/:insurerId/policies')
  createPolicy(
    @Param('insurerId') insurerId: string,
    @Body()
    body: {
      name: string;
      eligibilityCriteria?: EligibilityCriteria;
      details?: PolicyDetails;
      status?: string;
    },
  ) {
    return this.insurance.createPolicy(insurerId, body);
  }

  @Patch('policies/:id')
  updatePolicy(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      eligibilityCriteria?: EligibilityCriteria;
      details?: PolicyDetails;
      status?: string;
    },
  ) {
    return this.insurance.updatePolicy(id, body);
  }

  @Delete('policies/:id')
  deletePolicy(@Param('id') id: string) {
    return this.insurance.deletePolicy(id);
  }
}
