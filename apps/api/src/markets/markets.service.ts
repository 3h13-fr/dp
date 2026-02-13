import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketsService {
  constructor(private prisma: PrismaService) {}

  async getMarketByCountryCode(countryCode: string): Promise<{ id: string; bookingsAllowed: boolean; status: string; visibleToClient: boolean } | null> {
    const code = countryCode?.trim()?.toUpperCase();
    if (!code) return null;
    const market = await this.prisma.market.findUnique({
      where: { countryCode: code },
      select: { id: true, bookingsAllowed: true, status: true, visibleToClient: true },
    });
    return market;
  }

  async getActiveVisibleCountryCodes(): Promise<{ countryCodes: string[] }> {
    const data = await this.getActiveVisible();
    return { countryCodes: data.countryCodes };
  }

  async getActiveVisible(): Promise<{
    countryCodes: string[];
    bookingsAllowedCountryCodes: string[];
  }> {
    const markets = await this.prisma.market.findMany({
      where: { status: 'ACTIVE', visibleToClient: true },
      select: { countryCode: true, bookingsAllowed: true },
    });
    return {
      countryCodes: markets.map((m) => m.countryCode),
      bookingsAllowedCountryCodes: markets.filter((m) => m.bookingsAllowed).map((m) => m.countryCode),
    };
  }
}
