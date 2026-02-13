import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async listPoliciesForSelection(): Promise<{
    insurers: Array<{
      id: string;
      name: string;
      policies: Array<{
        id: string;
        name: string;
        eligibilityCriteria: unknown;
        details: unknown;
      }>;
    }>;
  }> {
    const insurers = await this.prisma.insurer.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: {
        policies: {
          where: { status: 'ACTIVE' },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            eligibilityCriteria: true,
            details: true,
          },
        },
      },
    });
    return { insurers };
  }
}
