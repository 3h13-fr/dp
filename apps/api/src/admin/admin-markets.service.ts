import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketStatus } from 'database';

export type CreateMarketDto = {
  countryCode: string;
  displayName: string;
  status?: MarketStatus;
  visibleToClient?: boolean;
  bookingsAllowed?: boolean;
  defaultCurrency?: string | null;
  defaultLanguage?: string | null;
  allowedLanguages?: string[];
  allowedCurrencies?: string[];
  paymentProvider?: string | null;
  paymentMethods?: string[];
  commissionPercent?: number | null;
  taxesEnabled?: boolean;
  vatIncluded?: boolean;
  defaultVatRate?: number | null;
  invoiceLegalMention?: string | null;
  seoIndexable?: boolean;
  internalNote?: string | null;
};

export type UpdateMarketDto = Partial<CreateMarketDto> & {
  policyIds?: string[];
  defaultPolicyId?: string | null;
};

@Injectable()
export class AdminMarketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    status?: MarketStatus;
    limit?: number;
    offset?: number;
  }) {
    const { search, status, limit = 50, offset = 0 } = params;
    const where: { status?: MarketStatus; OR?: Array<{ countryCode?: { contains: string; mode: 'insensitive' }; displayName?: { contains: string; mode: 'insensitive' } }> } = {};
    if (status) where.status = status;
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { countryCode: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.market.findMany({
        where,
        include: {
          policyLinks: {
            include: {
              insurancePolicy: { select: { id: true, name: true, insurer: { select: { name: true } } } },
            },
          },
        },
        orderBy: { displayName: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.market.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        policyLinks: {
          include: {
            insurancePolicy: {
              include: { insurer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!market) throw new NotFoundException('Market not found');
    return market;
  }

  async findByCountryCode(countryCode: string) {
    const code = countryCode?.trim()?.toUpperCase();
    if (!code) return null;
    return this.prisma.market.findUnique({
      where: { countryCode: code },
    });
  }

  async create(dto: CreateMarketDto) {
    const existing = await this.prisma.market.findUnique({
      where: { countryCode: dto.countryCode.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Market for country ${dto.countryCode} already exists`);
    }
    return this.prisma.market.create({
      data: {
        countryCode: dto.countryCode.toUpperCase(),
        displayName: dto.displayName,
        status: dto.status ?? 'DRAFT',
        visibleToClient: dto.visibleToClient ?? false,
        bookingsAllowed: dto.bookingsAllowed ?? false,
        defaultCurrency: dto.defaultCurrency ?? null,
        defaultLanguage: dto.defaultLanguage ?? null,
        allowedLanguages: (dto.allowedLanguages ?? []) as object,
        allowedCurrencies: (dto.allowedCurrencies ?? []) as object,
        paymentProvider: dto.paymentProvider ?? null,
        paymentMethods: (dto.paymentMethods ?? []) as object,
        commissionPercent: dto.commissionPercent ?? null,
        taxesEnabled: dto.taxesEnabled ?? false,
        vatIncluded: dto.vatIncluded ?? true,
        defaultVatRate: dto.defaultVatRate ?? null,
        invoiceLegalMention: dto.invoiceLegalMention ?? null,
        seoIndexable: dto.seoIndexable ?? true,
        internalNote: dto.internalNote ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateMarketDto) {
    await this.findById(id);
    const { policyIds, defaultPolicyId, ...rest } = dto;
    const updateData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) (updateData as Record<string, unknown>)[k] = v;
    }
    if (updateData.countryCode) (updateData as Record<string, unknown>).countryCode = String(updateData.countryCode).toUpperCase();
    await this.prisma.market.update({
      where: { id },
      data: updateData as object,
    });
    if (policyIds !== undefined) {
      await this.prisma.marketInsurancePolicy.deleteMany({ where: { marketId: id } });
      for (let i = 0; i < policyIds.length; i++) {
        const policyId = policyIds[i];
        await this.prisma.marketInsurancePolicy.create({
          data: {
            marketId: id,
            insurancePolicyId: policyId,
            isDefault: defaultPolicyId === policyId,
          },
        });
      }
    } else if (defaultPolicyId !== undefined) {
      await this.prisma.marketInsurancePolicy.updateMany({
        where: { marketId: id },
        data: { isDefault: false },
      });
      if (defaultPolicyId) {
        await this.prisma.marketInsurancePolicy.updateMany({
          where: { marketId: id, insurancePolicyId: defaultPolicyId },
          data: { isDefault: true },
        });
      }
    }
    return this.findById(id);
  }

  async duplicate(id: string) {
    const source = await this.findById(id);
    const suffix = Date.now().toString(36);
    const newMarket = await this.prisma.market.create({
      data: {
        countryCode: `${source.countryCode}_copy_${suffix}`,
        displayName: `${source.displayName} (copie)`,
        status: 'DRAFT',
        visibleToClient: false,
        bookingsAllowed: false,
        defaultCurrency: source.defaultCurrency,
        defaultLanguage: source.defaultLanguage,
        allowedLanguages: source.allowedLanguages as object,
        allowedCurrencies: source.allowedCurrencies as object,
        paymentProvider: source.paymentProvider,
        paymentMethods: (source.paymentMethods ?? []) as object,
        commissionPercent: source.commissionPercent,
        taxesEnabled: source.taxesEnabled,
        vatIncluded: source.vatIncluded,
        defaultVatRate: source.defaultVatRate,
        invoiceLegalMention: source.invoiceLegalMention,
        seoIndexable: source.seoIndexable,
        internalNote: source.internalNote,
      },
    });
    for (const link of source.policyLinks) {
      await this.prisma.marketInsurancePolicy.create({
        data: {
          marketId: newMarket.id,
          insurancePolicyId: link.insurancePolicyId,
          isDefault: link.isDefault,
        },
      });
    }
    return this.findById(newMarket.id);
  }

  async getActiveVisibleCountryCodes(): Promise<string[]> {
    const markets = await this.prisma.market.findMany({
      where: { status: 'ACTIVE', visibleToClient: true },
      select: { countryCode: true },
    });
    return markets.map((m) => m.countryCode);
  }
}
