import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingType } from 'database';
import { Prisma } from 'database';
import { VehicleService } from '../vehicles/vehicle.service';
import { KycService } from '../kyc/kyc.service';

export interface CreateListingInput {
  hostId: string;
  type: ListingType;
  title?: string | null;
  vehicleId?: string | null;
  seats?: number | null;
  doors?: number | null;
  luggage?: number | null;
  cityId?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pricePerDay?: number | null;
  currency?: string;
  caution?: number | null;
  description?: string | null;
  category?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  status?: string;
}

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private vehicle: VehicleService,
    private kyc: KycService,
  ) {}

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
    const withDisplayTitle = ordered.map((item) => ({
      ...item,
      displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
    }));
    return { items: withDisplayTitle, total };
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
    const withDisplayTitle = items.map((item) => ({
      ...item,
      displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
    }));
    return { items: withDisplayTitle, total };
  }

  async findOne(idOrSlug: string): Promise<unknown> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        photos: { orderBy: { order: 'asc' } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        vehicle: {
          include: {
            make: { select: { id: true, name: true, slug: true } },
            model: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const displayTitle = (listing.displayName ?? listing.title ?? '').toString().trim() || '—';
    return { ...listing, displayTitle };
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
    const withDisplayTitle = items.map((item) => ({
      ...item,
      displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
    }));
    return { items: withDisplayTitle, total };
  }

  /** Create listing. When vehicleId is set, displayName and slug are generated from vehicle (no free title). */
  async create(input: CreateListingInput) {
    const { vehicleId, type, hostId, seats, doors, luggage } = input;

    const hasKyc = await this.kyc.hasApprovedKyc(hostId);
    if (!hasKyc) {
      throw new ForbiddenException('Identity verification required to create a listing');
    }
    if (vehicleId) {
      if (type !== 'CAR_RENTAL' && type !== 'CHAUFFEUR') {
        throw new BadRequestException('Vehicle-linked listing must be CAR_RENTAL or CHAUFFEUR');
      }
      if (seats == null || seats < 1) {
        throw new BadRequestException('seats is required and must be at least 1');
      }
      if (doors == null || doors < 2 || doors > 5) {
        throw new BadRequestException('doors is required and must be between 2 and 5');
      }
      if (luggage == null || luggage < 0) {
        throw new BadRequestException('luggage is required and must be >= 0');
      }
    }

    let displayName: string | null = null;
    let slug: string;
    let title: string | null = null;

    if (vehicleId) {
      const vehicle = await this.vehicle.findById(vehicleId);
      if (!vehicle) throw new BadRequestException('Vehicle not found');
      displayName = this.vehicle.getCanonicalDisplayName(vehicle);
      const citySlug =
        input.cityId
          ? (await this.prisma.city.findUnique({ where: { id: input.cityId } }))?.slug
          : null;
      const suffix = citySlug || 'listing';
      slug = this.vehicle.listingSlugFromVehicle(vehicle, suffix);
      const existing = await this.prisma.listing.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
    } else {
      if (!input.title) throw new BadRequestException('title or vehicleId required');
      title = input.title;
      slug = input.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      const existing = await this.prisma.listing.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;
    }

    const data: Prisma.ListingCreateInput = {
      type,
      host: { connect: { id: hostId } },
      ...(vehicleId ? { vehicle: { connect: { id: vehicleId } } } : {}),
      title,
      displayName,
      slug,
      description: input.description ?? undefined,
      status: input.status ?? 'DRAFT',
      ...(input.cityId ? { cityRef: { connect: { id: input.cityId } } } : {}),
      city: input.city ?? undefined,
      country: input.country ?? undefined,
      address: input.address ?? undefined,
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
      pricePerDay: input.pricePerDay ?? undefined,
      currency: input.currency ?? 'EUR',
      caution: input.caution ?? undefined,
      category: input.category ?? undefined,
      seats: seats ?? undefined,
      doors: doors ?? undefined,
      luggage: luggage ?? undefined,
    };
    if (!vehicleId && input.transmission != null) data.transmission = input.transmission;
    if (!vehicleId && input.fuelType != null) data.fuelType = input.fuelType;

    const listing = await this.prisma.listing.create({
      data,
      include: {
        vehicle: { include: { make: true, model: true } },
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return listing;
  }

  /** Update listing. Only the host (owner) can update. Allowed fields: description, pricePerDay, currency, caution, status (DRAFT, PENDING, ACTIVE). */
  async update(
    hostId: string,
    id: string,
    data: {
      description?: string | null;
      pricePerDay?: number | null;
      currency?: string;
      caution?: number | null;
      status?: string;
    },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, hostId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new NotFoundException('Listing not found');

    const allowedStatuses = ['DRAFT', 'PENDING', 'ACTIVE'];
    const updateData: Prisma.ListingUpdateInput = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.pricePerDay !== undefined) updateData.pricePerDay = data.pricePerDay;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.caution !== undefined) updateData.caution = data.caution;
    if (data.status !== undefined) {
      if (!allowedStatuses.includes(data.status)) {
        throw new BadRequestException('Host can only set status to DRAFT, PENDING, or ACTIVE');
      }
      updateData.status = data.status;
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        photos: { orderBy: { order: 'asc' } },
        host: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    const displayTitle = (updated.displayName ?? updated.title ?? '').toString().trim() || '—';
    return { ...updated, displayTitle };
  }
}
