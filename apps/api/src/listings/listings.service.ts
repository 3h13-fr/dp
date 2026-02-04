import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingType } from 'database';
import { Prisma } from 'database';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  /** Search listings within radius (meters) of a point, ordered by distance. Uses PostGIS. */
  async searchByLocation(params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    type?: ListingType;
    limit?: number;
    offset?: number;
  }): Promise<{ items: unknown[]; total: number }> {
    const { latitude, longitude, radiusMeters = 50_000, type, limit = 20, offset = 0 } = params;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    const radius = radiusMeters;

    const idsWithDistance = await this.prisma.$queryRaw<{ id: string; distance: number }[]>`
      SELECT id, ST_Distance(location, ${point}) as distance
      FROM "Listing"
      WHERE status = 'ACTIVE'
        AND location IS NOT NULL
        AND ST_DWithin(location, ${point}, ${radius})
        ${type ? Prisma.sql`AND type = ${type}` : Prisma.empty}
      ORDER BY distance
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    if (idsWithDistance.length === 0) return { items: [], total: 0 };

    const ids = idsWithDistance.map((r) => r.id);
    const items = await this.prisma.listing.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: {
        photos: { orderBy: { order: 'asc' }, take: 5 },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    const ordered = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as typeof items;
    const total = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Listing"
      WHERE status = 'ACTIVE' AND location IS NOT NULL AND ST_DWithin(location, ${point}, ${radius})
      ${type ? Prisma.sql`AND type = ${type}` : Prisma.empty}
    `.then((r) => Number(r[0]?.count ?? 0));
    return { items: ordered, total };
  }

  async findMany(params: {
    type?: ListingType;
    city?: string;
    country?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: unknown[]; total: number }> {
    const { type, city, country, category, limit = 20, offset = 0 } = params;
    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (type) where.type = type;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (category) where.category = { equals: category, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: {
          photos: { orderBy: { order: 'asc' }, take: 5 },
          host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total };
  }

  async findOne(id: string): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { order: 'asc' } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  /** Listings of the given host (for host dashboard). */
  async findForHost(hostId: string, limit = 50, offset = 0): Promise<{ items: unknown[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { hostId },
        include: {
          photos: { orderBy: { order: 'asc' }, take: 3 },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.listing.count({ where: { hostId } }),
    ]);
    return { items, total };
  }
}
