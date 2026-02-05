import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeoService {
  constructor(private prisma: PrismaService) {}

  async findCountries(): Promise<unknown[]> {
    return this.prisma.country.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findRegionsByCountry(countryId: string): Promise<unknown[]> {
    return this.prisma.region.findMany({
      where: { countryId },
      orderBy: { slug: 'asc' },
    });
  }

  async findCitiesByCountry(countryId: string, limit = 500): Promise<unknown[]> {
    return this.prisma.city.findMany({
      where: { countryId },
      include: { country: { select: { code: true, slug: true } } },
      orderBy: { slug: 'asc' },
      take: limit,
    });
  }

  async findCityBySlug(countrySlug: string, citySlug: string): Promise<unknown | null> {
    const country = await this.prisma.country.findUnique({
      where: { slug: countrySlug },
    });
    if (!country) return null;
    return this.prisma.city.findUnique({
      where: {
        countryId_slug: { countryId: country.id, slug: citySlug },
      },
      include: { country: true, region: true },
    });
  }
}
