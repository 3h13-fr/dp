import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EligibilityCriteria = {
  vehicleYearMin?: number | null;
  vehicleYearMax?: number | null;
  minDriverAge?: number | null;
  minLicenseYears?: number | null;
  fiscalPowerMin?: number | null;
  fiscalPowerMax?: number | null;
  allowedCountries?: string[];
  registrationCountries?: string[];
  ownerTypes?: ('PARTICULAR' | 'PROFESSIONAL')[];
  secondaryDriverAllowed?: boolean | null;
};

export type PolicyDetails = {
  cautionAmount?: number | null;
  assistance0km?: boolean | null;
  roadsideAssistance?: boolean | null;
  personalEffectsProtection?: boolean | null;
  compensationCeiling?: number | null;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
};

@Injectable()
export class AdminInsuranceService {
  constructor(private prisma: PrismaService) {}

  async getInsurers(): Promise<{ items: { id: string; name: string; status: string; _count: { policies: number } }[] }> {
    const items = await this.prisma.insurer.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { policies: true } } },
    });
    return { items };
  }

  async getInsurerById(id: string) {
    const insurer = await this.prisma.insurer.findUnique({
      where: { id },
      include: { policies: true },
    });
    if (!insurer) throw new NotFoundException('Insurer not found');
    return insurer;
  }

  async createInsurer(body: { name: string; status?: string }) {
    return this.prisma.insurer.create({
      data: {
        name: body.name,
        status: body.status ?? 'ACTIVE',
      },
    });
  }

  async updateInsurer(id: string, body: { name?: string; status?: string }) {
    await this.getInsurerById(id);
    return this.prisma.insurer.update({
      where: { id },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.status != null && { status: body.status }),
      },
    });
  }

  async deleteInsurer(id: string) {
    await this.getInsurerById(id);
    return this.prisma.insurer.delete({ where: { id } });
  }

  async getPolicies(insurerId: string) {
    await this.getInsurerById(insurerId);
    return this.prisma.insurancePolicy.findMany({
      where: { insurerId },
      orderBy: { name: 'asc' },
    });
  }

  async getPolicyById(policyId: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({
      where: { id: policyId },
      include: { insurer: true },
    });
    if (!policy) throw new NotFoundException('Insurance policy not found');
    return policy;
  }

  async createPolicy(
    insurerId: string,
    body: {
      name: string;
      eligibilityCriteria?: EligibilityCriteria;
      details?: PolicyDetails;
      status?: string;
    },
  ) {
    await this.getInsurerById(insurerId);
    return this.prisma.insurancePolicy.create({
      data: {
        insurerId,
        name: body.name,
        eligibilityCriteria: (body.eligibilityCriteria ?? {}) as object,
        details: (body.details ?? {}) as object,
        status: body.status ?? 'ACTIVE',
      },
    });
  }

  async updatePolicy(
    policyId: string,
    body: {
      name?: string;
      eligibilityCriteria?: EligibilityCriteria;
      details?: PolicyDetails;
      status?: string;
    },
  ) {
    await this.getPolicyById(policyId);
    return this.prisma.insurancePolicy.update({
      where: { id: policyId },
      data: {
        ...(body.name != null && { name: body.name }),
        ...(body.eligibilityCriteria != null && { eligibilityCriteria: body.eligibilityCriteria as object }),
        ...(body.details != null && { details: body.details as object }),
        ...(body.status != null && { status: body.status }),
      },
    });
  }

  async deletePolicy(policyId: string) {
    await this.getPolicyById(policyId);
    return this.prisma.insurancePolicy.delete({ where: { id: policyId } });
  }
}
