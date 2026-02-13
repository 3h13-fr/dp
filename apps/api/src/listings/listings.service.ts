import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingType } from 'database';
import { Prisma } from 'database';
import { VehicleService } from '../vehicles/vehicle.service';
import { KycService } from '../kyc/kyc.service';
import { MarketsService } from '../markets/markets.service';

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
  categories?: string[] | null; // Array of category IDs
  transmission?: string | null;
  fuelType?: string | null;
  status?: string;
  options?: Record<string, unknown> | null;
  // Booking rules
  minBookingNoticeHours?: number | null;
  maxBookingAdvanceDays?: number | null;
  instantBooking?: boolean;
  manualApprovalRequired?: boolean;
  minRentalDurationHours?: number | null;
  maxRentalDurationDays?: number | null;
  autoAcceptBookings?: boolean;
  // Renter conditions
  minDriverAge?: number | null;
  minLicenseYears?: number | null;
}

/** Maps country code to search terms for matching listing.country (free text) */
const COUNTRY_MATCH_TERMS: Record<string, string[]> = {
  fr: ['fr', 'france', 'french'],
  be: ['be', 'belgium', 'belgique'],
  ch: ['ch', 'switzerland', 'suisse'],
  lu: ['lu', 'luxembourg'],
  de: ['de', 'germany', 'deutschland'],
  es: ['es', 'spain', 'espagne'],
  it: ['it', 'italy', 'italie'],
  nl: ['nl', 'netherlands', 'holland'],
  us: ['us', 'usa', 'united states', 'america'],
  en: ['en', 'uk', 'england', 'united kingdom'],
};

function isListingInActiveMarket(
  listing: { country?: string | null; cityRef?: { country?: { code?: string } } | null },
  activeCodes: string[],
): boolean {
  // Option B: prefer cityRef.country.code (structured) when available
  const structuredCode = listing.cityRef?.country?.code?.trim();
  if (structuredCode) {
    const codeLower = structuredCode.toLowerCase();
    if (activeCodes.some((c) => c.toLowerCase() === codeLower)) return true;
  }
  // Fallback: listing.country (free text)
  const raw = listing.country?.trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  for (const code of activeCodes) {
    const terms = COUNTRY_MATCH_TERMS[code.toLowerCase()] ?? [code.toLowerCase()];
    if (terms.some((t) => lower === t || lower.includes(t))) return true;
  }
  return false;
}

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private vehicle: VehicleService,
    private kyc: KycService,
    private markets: MarketsService,
  ) {}

  /** Search listings within radius (meters) of a point, ordered by distance. Uses PostGIS. Falls back to findMany if PostGIS is not available. */
  async searchByLocation(params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    type?: ListingType;
    limit?: number;
    offset?: number;
    city?: string;
    startAt?: string;
    endAt?: string;
    category?: string;
  }): Promise<{ items: unknown[]; total: number }> {
    const { latitude, longitude, radiusMeters, type, limit = 20, offset = 0, city } = params;
    const radius = radiusMeters ?? 50_000;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;

    // Log de diagnostic
    console.log('[ListingsService.searchByLocation] Starting search with:', {
      latitude,
      longitude,
      radius,
      type,
      city,
      category: params.category,
      limit,
      offset,
    });

    try {
      // Build the WHERE clause with type filter if needed
      // Cast explicitement le type en enum ListingType pour PostgreSQL
      // Valider que le type est une valeur valide de l'enum avant de l'utiliser
      const validTypes: ListingType[] = ['CAR_RENTAL', 'CHAUFFEUR', 'MOTORIZED_EXPERIENCE'];
      
      // Use Prisma.sql for numeric values - Prisma will handle them as parameters
      const radiusSql = Prisma.sql`${radius}`;
      const limitSql = Prisma.sql`${limit}`;
      const offsetSql = Prisma.sql`${offset}`;
      
      // Construire la requête avec ou sans filtre de type
      // Pour le cast d'enum PostgreSQL, on doit utiliser Prisma.sql avec le cast dans le template
      // Mais comme Prisma utilise des paramètres préparés, on doit construire le filtre différemment
      let idsWithDistance: { id: string; distance: number }[];
      
      if (type && validTypes.includes(type)) {
        // Utiliser CAST pour convertir le paramètre texte en enum ListingType
        // PostgreSQL nécessite un cast explicite pour comparer un enum avec du texte
        const typeValue = Prisma.sql`${type}`;
        idsWithDistance = await this.prisma.$queryRaw<{ id: string; distance: number }[]>`
          SELECT id, ST_Distance(location, ${point}) as distance
          FROM "Listing"
          WHERE status = 'ACTIVE'
            AND location IS NOT NULL
            AND ST_DWithin(location, ${point}, ${radiusSql})
            AND type = CAST(${typeValue} AS "ListingType")
          ORDER BY distance
          LIMIT ${limitSql}
          OFFSET ${offsetSql}
        `;
      } else {
        idsWithDistance = await this.prisma.$queryRaw<{ id: string; distance: number }[]>`
          SELECT id, ST_Distance(location, ${point}) as distance
          FROM "Listing"
          WHERE status = 'ACTIVE'
            AND location IS NOT NULL
            AND ST_DWithin(location, ${point}, ${radiusSql})
          ORDER BY distance
          LIMIT ${limitSql}
          OFFSET ${offsetSql}
        `;
      }
      
      // Si 0 résultats PostGIS et qu'on a une ville, utiliser directement findMany avec la ville
      if (idsWithDistance.length === 0) {
        console.warn('[ListingsService.searchByLocation] No listings found in radius', {
          latitude,
          longitude,
          radius,
          type,
          city,
          category: params.category,
        });
        
        // Si on a city en paramètre, utiliser directement findMany avec city (fallback)
        if (city) {
          console.log('[ListingsService.searchByLocation] Using city fallback:', {
            city,
            type,
            category: params.category,
            startAt: params.startAt,
            endAt: params.endAt,
          });
          const fallbackResult = await this.findMany({
            type,
            city,
            limit,
            offset,
            startAt: params.startAt,
            endAt: params.endAt,
            category: params.category,
          });
          console.log('[ListingsService.searchByLocation] Fallback result:', {
            itemsCount: fallbackResult.items.length,
            total: fallbackResult.total,
          });
          return fallbackResult;
        }
        
        // Si pas de city mais rayon très petit (< 5km), réessayer avec un rayon plus large (50km)
        if (radius < 5000) {
          console.log('[ListingsService.searchByLocation] Radius too small, retrying with 50km radius');
          const expandedRadius = 50000; // 50km
          const expandedRadiusSql = Prisma.sql`${expandedRadius}`;
          
          // Utiliser la même approche de cast pour la requête avec rayon étendu
          let idsWithDistanceExpanded: { id: string; distance: number }[];
          if (type && validTypes.includes(type)) {
            const typeValue = Prisma.sql`${type}`;
            idsWithDistanceExpanded = await this.prisma.$queryRaw<{ id: string; distance: number }[]>`
              SELECT id, ST_Distance(location, ${point}) as distance
              FROM "Listing"
              WHERE status = 'ACTIVE'
                AND location IS NOT NULL
                AND ST_DWithin(location, ${point}, ${expandedRadiusSql})
                AND type = CAST(${typeValue} AS "ListingType")
              ORDER BY distance
              LIMIT ${limitSql}
              OFFSET ${offsetSql}
            `;
          } else {
            idsWithDistanceExpanded = await this.prisma.$queryRaw<{ id: string; distance: number }[]>`
              SELECT id, ST_Distance(location, ${point}) as distance
              FROM "Listing"
              WHERE status = 'ACTIVE'
                AND location IS NOT NULL
                AND ST_DWithin(location, ${point}, ${expandedRadiusSql})
              ORDER BY distance
              LIMIT ${limitSql}
              OFFSET ${offsetSql}
            `;
          }
          
          if (idsWithDistanceExpanded.length > 0) {
            console.log('[ListingsService.searchByLocation] Found listings with expanded radius:', {
              itemsCount: idsWithDistanceExpanded.length,
            });
            const ids = idsWithDistanceExpanded.map((r) => r.id);
            // Continuer avec le traitement normal des résultats
            const whereClause: Prisma.ListingWhereInput = {
              id: { in: ids },
              status: 'ACTIVE',
            };
            
            // Filtrer par catégorie si présent
            if (params.category && type) {
              whereClause.categories = {
                some: {
                  category: {
                    slug: { equals: params.category.toLowerCase().trim(), mode: 'insensitive' },
                    vertical: type,
                  },
                },
              };
            }
            
            const items = await this.prisma.listing.findMany({
              where: whereClause,
              include: {
                photos: { orderBy: { order: 'asc' }, take: 5 },
                host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                categories: { include: { category: { select: { id: true, slug: true, vertical: true } } } },
                cityRef: { select: { country: { select: { code: true } } } },
              },
            });
            
            const withDisplayTitle = items.map((item) => ({
              ...item,
              displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
            }));
            
            let filteredItems = this.filterByVehicleConditions(withDisplayTitle, params.startAt, params.endAt);
            const { countryCodes: activeCodesExpanded } = await this.markets.getActiveVisibleCountryCodes();
            if (activeCodesExpanded.length > 0) {
              filteredItems = filteredItems.filter((item) =>
                isListingInActiveMarket(item as { country?: string | null }, activeCodesExpanded),
              );
            } else {
              filteredItems = [];
            }
            
            const total = filteredItems.length;
            
            return {
              items: filteredItems,
              total,
            };
          }
        }
        
        // Dernier recours : si aucun résultat et pas de city, retourner tous les listings du type (si pas de filtre géographique prévu)
        // Cela peut arriver si l'utilisateur arrive sur /location sans paramètres et bouge la carte
        console.warn('[ListingsService.searchByLocation] No results found, falling back to all listings of type');
        const fallbackAllResult = await this.findMany({
          type,
          limit,
          offset,
          startAt: params.startAt,
          endAt: params.endAt,
          category: params.category,
        });
        console.log('[ListingsService.searchByLocation] Fallback to all listings result:', {
          itemsCount: fallbackAllResult.items.length,
          total: fallbackAllResult.total,
        });
        return fallbackAllResult;
      }

      const ids = idsWithDistance.map((r) => r.id);
      
      // Construire le where clause avec filtrage par catégorie si présent
      const whereClause: Prisma.ListingWhereInput = {
        id: { in: ids },
        status: 'ACTIVE',
      };
      
      // Ajouter le filtre de catégorie si présent
      if (params.category && type) {
        const categorySlug = params.category.toLowerCase().trim();
        whereClause.categories = {
          some: {
            category: {
              slug: { equals: categorySlug, mode: 'insensitive' },
              vertical: type,
            },
          },
        };
        console.log('[ListingsService.searchByLocation] Filtering by category:', {
          categorySlug,
          type,
          idsCount: ids.length,
        });
      }
      
      const items = await this.prisma.listing.findMany({
        where: whereClause,
        include: {
          photos: { orderBy: { order: 'asc' }, take: 5 },
          host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          categories: { include: { category: { select: { id: true, slug: true, vertical: true } } } },
          cityRef: { select: { country: { select: { code: true } } } },
        },
      });
      
      console.log('[ListingsService.searchByLocation] Found items:', {
        itemsCount: items.length,
        categoryFilter: params.category,
        itemsWithCategories: items.filter((item: any) => item.categories?.length > 0).map((item: any) => ({
          id: item.id,
          categorySlugs: item.categories?.map((lc: any) => lc.category?.slug),
        })),
      });
      const ordered = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as typeof items;
      
      // Calculer le total en tenant compte du filtre de catégorie si présent
      let total: number;
      if (params.category && type) {
        // Si on a un filtre de catégorie, compter les items filtrés
        total = ordered.length;
      } else {
        // Sinon, compter tous les listings dans le rayon
        // Utiliser la même approche de cast pour la requête COUNT
        if (type && validTypes.includes(type)) {
          const typeValue = Prisma.sql`${type}`;
          total = await this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM "Listing"
            WHERE status = 'ACTIVE' 
              AND location IS NOT NULL 
              AND ST_DWithin(location, ${point}, ${radiusSql})
              AND type = CAST(${typeValue} AS "ListingType")
          `.then((r) => Number(r[0]?.count ?? 0));
        } else {
          total = await this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*) as count FROM "Listing"
            WHERE status = 'ACTIVE' 
              AND location IS NOT NULL 
              AND ST_DWithin(location, ${point}, ${radiusSql})
          `.then((r) => Number(r[0]?.count ?? 0));
        }
      }
      const withDisplayTitle = ordered.map((item) => ({
        ...item,
        displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
      }));
      
      console.log('[ListingsService.searchByLocation] Before vehicle conditions filter:', {
        itemsCount: withDisplayTitle.length,
        startAt: params.startAt,
        endAt: params.endAt,
        postGisResultsCount: ids.length,
        categoryFilter: params.category,
      });
      
      // Filtrer par conditions de véhicule si startAt et endAt sont fournis
      let filteredItems = this.filterByVehicleConditions(withDisplayTitle, params.startAt, params.endAt);

      // Only show listings in active+visible markets. No visible market = show nothing.
      const { countryCodes: activeCodes } = await this.markets.getActiveVisibleCountryCodes();
      if (activeCodes.length > 0) {
        filteredItems = filteredItems.filter((item) =>
          isListingInActiveMarket(item as { country?: string | null }, activeCodes),
        );
      } else {
        filteredItems = [];
      }
      
      console.log('[ListingsService.searchByLocation] After vehicle conditions filter:', {
        itemsCount: filteredItems.length,
        excludedCount: withDisplayTitle.length - filteredItems.length,
      });
      
      return { items: filteredItems, total: filteredItems.length };
    } catch (error) {
      console.error('[ListingsService.searchByLocation] PostGIS query failed:', error);
      console.error('[ListingsService.searchByLocation] Error details:', error instanceof Error ? error.message : String(error));
      console.error('[ListingsService.searchByLocation] Params:', { latitude, longitude, radius, type, limit, offset, city });
      
      // Fallback intelligent : si city est disponible, essayer findMany avec city
      if (city) {
        console.warn('[ListingsService.searchByLocation] Falling back to findMany with city filter');
        return this.findMany({
          type,
          city,
          limit,
          offset,
          startAt: params.startAt,
          endAt: params.endAt,
          category: params.category,
        });
      }
      
      // Sinon, retourner une liste vide
      return { items: [], total: 0 };
    }
  }

  async findMany(params: {
    type?: ListingType;
    city?: string;
    country?: string;
    category?: string;
    transmission?: string;
    fuelType?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
    radiusKm?: number;
    startAt?: string;
    endAt?: string;
  }): Promise<{ items: unknown[]; total: number }> {
    const { type, city, country, category, transmission, fuelType, sortBy, limit = 20, offset = 0, radiusKm } = params;
    
    // If city is provided, try to use city coordinates for radius search
    // Note: If lat/lng are provided, the controller calls searchByLocation directly, so we only get here if city is provided without lat/lng
    if (city) {
      const cityLower = city.toLowerCase().trim();
      
      // Improved city search: try multiple strategies using raw SQL for robust JSONB search
      // 1. Exact match on slug
      // 2. Partial match on slug  
      // 3. JSONB search on name fields (en/fr) using raw SQL
      const matchingCities = await this.prisma.$queryRaw<Array<{ id: string; latitude: number; longitude: number; slug: string }>>`
        SELECT id, latitude, longitude, slug
        FROM "City"
        WHERE 
          LOWER(slug) = ${cityLower}
          OR LOWER(slug) LIKE ${`%${cityLower}%`}
          OR LOWER(name->>'en') LIKE ${`%${cityLower}%`}
          OR LOWER(name->>'fr') LIKE ${`%${cityLower}%`}
        LIMIT 1
      `;
      
      const matchingCity = matchingCities[0];
      
      if (matchingCity?.latitude != null && matchingCity?.longitude != null) {
        // Use searchByLocation with radius of 20km by default (or specified radiusKm)
        const radiusMeters = (radiusKm ?? 20) * 1000;
        const geoResult = await this.searchByLocation({
          latitude: matchingCity.latitude,
          longitude: matchingCity.longitude,
          radiusMeters,
          type,
          limit,
          offset,
          startAt: params.startAt,
          endAt: params.endAt,
        });
        // When PostGIS returns 0 results (e.g. no listings with location in radius), fallback to listings by cityId / city name
        if (geoResult.total === 0) {
          console.warn('[ListingsService.findMany] PostGIS returned 0, using city fallback for cityId', matchingCity.id);
          const cityAndConditions: Prisma.ListingWhereInput[] = [
            {
              OR: [
                { cityId: matchingCity.id },
                { city: { contains: cityLower, mode: 'insensitive' } },
              ],
            },
          ];
          const { countryCodes: activeCountryCodesCity } = await this.markets.getActiveVisibleCountryCodes();
          if (activeCountryCodesCity.length === 0) {
            return { items: [], total: 0 };
          }
          const marketConditions = activeCountryCodesCity.flatMap((code) => {
            const terms = COUNTRY_MATCH_TERMS[code.toLowerCase()] ?? [code.toLowerCase()];
            const countryConditions = terms.map((term) => ({ country: { equals: term, mode: 'insensitive' as const } }));
            const cityRefCondition = { cityRef: { country: { code: { equals: code, mode: 'insensitive' as const } } } };
            return [...countryConditions, cityRefCondition];
          });
          cityAndConditions.push({ OR: marketConditions });
          const cityWhere: Prisma.ListingWhereInput = {
            status: 'ACTIVE',
            ...(type ? { type } : {}),
            AND: cityAndConditions,
          };
          const [cityItems, cityTotal] = await Promise.all([
            this.prisma.listing.findMany({
              where: cityWhere,
              include: {
                photos: { orderBy: { order: 'asc' }, take: 5 },
                host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                cityRef: { select: { country: { select: { code: true } } } },
              },
              orderBy: { updatedAt: 'desc' },
              take: limit,
              skip: offset,
            }),
            this.prisma.listing.count({ where: cityWhere }),
          ]);
          const withDisplayTitle = cityItems.map((item) => ({
            ...item,
            displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
          }));
          
          // Filtrer par conditions de véhicule si startAt et endAt sont fournis
          const filteredItems = this.filterByVehicleConditions(withDisplayTitle, params.startAt, params.endAt);
          
          return { items: filteredItems, total: filteredItems.length };
        }
        return geoResult;
      }
      
      // If city is provided but not found in City table, return empty list
      // This prevents returning all vehicles with the city name in their city field
      console.warn(`[ListingsService.findMany] City "${city}" not found in City table, returning empty results`);
      return { items: [], total: 0 };
    }
    
    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (type) where.type = type;
    
    // Country filter: handle both country codes (like "fr") and full names (like "France")
    if (country) {
      const countryLower = country.toLowerCase().trim();
      // Map common 2-letter country codes to full names for better matching
      const countryCodeMap: Record<string, string[]> = {
        'fr': ['france', 'french'],
        'en': ['england', 'united kingdom', 'uk'],
        'us': ['united states', 'usa', 'america'],
        'de': ['germany', 'deutschland'],
        'es': ['spain', 'espagne'],
        'it': ['italy', 'italie'],
        'nl': ['netherlands', 'holland'],
        'be': ['belgium', 'belgique'],
        'ch': ['switzerland', 'suisse'],
      };
      
      const searchTerms = countryCodeMap[countryLower] 
        ? [countryLower, ...countryCodeMap[countryLower]]
        : [countryLower];
      
      // Build country conditions
      const countryConditions = searchTerms.map(term => ({
        country: { contains: term, mode: 'insensitive' },
      }));
      
      // If where.OR already exists (from city search), combine with AND
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: countryConditions },
        ];
        delete where.OR;
      } else {
        // Simple country search with OR for multiple terms
        where.OR = countryConditions;
      }
    }
    // Filtrer par catégorie : categories est une relation many-to-many
    if (category && type) {
      where.categories = {
        some: {
          category: {
            slug: { equals: category.toLowerCase().trim(), mode: 'insensitive' },
            vertical: type,
          },
        },
      };
    }
    if (transmission) where.transmission = { equals: transmission, mode: 'insensitive' };
    if (fuelType) where.fuelType = { equals: fuelType, mode: 'insensitive' };

    // Only show listings in active+visible markets (Option B: cityRef.country.code + listing.country fallback)
    // No visible market = show nothing
    const { countryCodes: activeCountryCodes } = await this.markets.getActiveVisibleCountryCodes();
    if (activeCountryCodes.length === 0) {
      return { items: [], total: 0 };
    }
    const marketCountryConditions = activeCountryCodes.flatMap((code) => {
      const terms = COUNTRY_MATCH_TERMS[code.toLowerCase()] ?? [code.toLowerCase()];
      const countryConditions = terms.map((term) => ({ country: { equals: term, mode: 'insensitive' as const } }));
      const cityRefCondition = { cityRef: { country: { code: { equals: code, mode: 'insensitive' as const } } } };
      return [...countryConditions, cityRefCondition];
    });
    const marketCondition = { OR: marketCountryConditions };
    where.AND = [...((where.AND as object[]) || []), marketCondition];

    const orderBy: { updatedAt?: 'asc' | 'desc'; pricePerDay?: 'asc' | 'desc' } =
      sortBy === 'priceAsc'
        ? { pricePerDay: 'asc' }
        : sortBy === 'priceDesc'
          ? { pricePerDay: 'desc' }
          : { updatedAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: {
          photos: { orderBy: { order: 'asc' }, take: 5 },
          host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          cityRef: { select: { country: { select: { code: true } } } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.listing.count({ where }),
    ]);
    
    const withDisplayTitle = items.map((item) => ({
      ...item,
      displayTitle: (item.displayName ?? item.title ?? '').toString().trim() || '—',
    }));
    
    // Filtrer par conditions de véhicule si startAt et endAt sont fournis
    const filteredItems = this.filterByVehicleConditions(withDisplayTitle, params.startAt, params.endAt);
    
    return { items: filteredItems, total: filteredItems.length };
  }

  /**
   * Filter listings by vehicle-specific conditions (min/max rental duration, booking notice, advance booking limits)
   */
  private filterByVehicleConditions(
    items: unknown[],
    startAt?: string,
    endAt?: string,
  ): unknown[] {
    if (!startAt || !endAt) {
      return items;
    }

    try {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);
      const now = new Date();

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
        console.warn('[ListingsService.filterByVehicleConditions] Invalid date range', { startAt, endAt });
        return items;
      }

      // Calculate rental duration in hours and days
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
      // Use actual date difference for days calculation (more accurate than dividing hours by 24)
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      // Calculate notice period (time between now and startAt) in hours and days
      const noticeMs = startDate.getTime() - now.getTime();
      const noticeHours = Math.ceil(noticeMs / (1000 * 60 * 60));
      const noticeDays = Math.ceil(noticeMs / (1000 * 60 * 60 * 24));

      console.log('[ListingsService.filterByVehicleConditions] Filtering items:', {
        itemsCount: items.length,
        startAt,
        endAt,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        now: now.toISOString(),
        durationMs,
        durationHours,
        durationDays,
        noticeMs,
        noticeHours,
        noticeDays,
      });

      // Filter items based on vehicle conditions
      const excludedReasons: Array<{ id: string; reason: string }> = [];
      const filtered = items.filter((item: any) => {
        // Check minimum rental duration
        if (item.minRentalDurationHours != null && durationHours < item.minRentalDurationHours) {
          excludedReasons.push({
            id: item.id,
            reason: `Duration too short: ${durationHours}h < ${item.minRentalDurationHours}h`,
          });
          return false;
        }

        // Check maximum rental duration
        if (item.maxRentalDurationDays != null && durationDays > item.maxRentalDurationDays) {
          excludedReasons.push({
            id: item.id,
            reason: `Duration too long: ${durationDays}d > ${item.maxRentalDurationDays}d`,
          });
          return false;
        }

        // Check minimum booking notice (only if startAt is in the future)
        if (noticeMs > 0 && item.minBookingNoticeHours != null && noticeHours < item.minBookingNoticeHours) {
          excludedReasons.push({
            id: item.id,
            reason: `Notice too short: ${noticeHours}h < ${item.minBookingNoticeHours}h`,
          });
          return false;
        }

        // Check maximum advance booking limit (only if startAt is in the future)
        if (noticeMs > 0 && item.maxBookingAdvanceDays != null && noticeDays > item.maxBookingAdvanceDays) {
          excludedReasons.push({
            id: item.id,
            reason: `Advance booking too far: ${noticeDays}d > ${item.maxBookingAdvanceDays}d`,
          });
          return false;
        }

        return true;
      });

      console.log('[ListingsService.filterByVehicleConditions] After filtering:', {
        itemsCount: filtered.length,
        excludedCount: items.length - filtered.length,
        excludedReasons: excludedReasons.slice(0, 10), // Limit to first 10 for readability
      });

      return filtered;
    } catch (error) {
      console.error('[ListingsService.filterByVehicleConditions] Error filtering items:', error);
      return items; // Return all items if filtering fails
    }
  }

  async findOne(idOrSlug: string): Promise<unknown> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        photos: { orderBy: { order: 'asc' } },
        host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        categories: { include: { category: { select: { id: true, name: true, slug: true, vertical: true, imageUrl: true } } } },
        cityRef: {
          select: {
            id: true,
            slug: true,
            name: true,
            region: { select: { id: true, slug: true, name: true } },
            country: { select: { code: true } },
          },
        },
        vehicle: {
          select: {
            id: true,
            vin: true,
            modelYear: true,
            trimLabel: true,
            transmissionType: true,
            fuelType: true,
            driveType: true,
            topSpeedKmh: true,
            zeroTo100S: true,
            powerKw: true,
            powerCv: true,
            batteryKwh: true,
            registrationCountry: true,
            licensePlate: true,
            fiscalPower: true,
            ownerType: true,
            make: { select: { id: true, name: true, slug: true } },
            model: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const opts = listing.options as { insurance?: { policyIds?: string[] } } | null;
    if (opts?.insurance?.policyIds?.length) {
      let hostPolicyIds = opts.insurance.policyIds;
      const countryRaw = listing.country?.trim();
      if (countryRaw) {
        const market = await this.prisma.market.findUnique({
          where: { countryCode: countryRaw.toUpperCase() },
          include: { policyLinks: { select: { insurancePolicyId: true } } },
        });
        if (market?.policyLinks?.length) {
          const marketPolicyIds = new Set(market.policyLinks.map((l) => l.insurancePolicyId));
          hostPolicyIds = hostPolicyIds.filter((id) => marketPolicyIds.has(id));
        }
      }
      const policies = await this.prisma.insurancePolicy.findMany({
        where: { id: { in: hostPolicyIds }, status: 'ACTIVE' },
        select: { id: true, name: true, eligibilityCriteria: true },
      });
      (listing as any).options = {
        ...opts,
        insurance: { ...opts.insurance, policies },
      };
    }
    const displayTitle = (listing.displayName ?? listing.title ?? '').toString().trim() || '—';
    return { ...listing, displayTitle };
  }

  /** Listings of the given host (for host dashboard). */
  async findForHost(
    hostId: string,
    limit = 50,
    offset = 0,
    type?: ListingType,
    status?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    const where: Prisma.ListingWhereInput = { hostId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: {
          photos: { orderBy: { order: 'asc' }, take: 3 },
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
      categories: input.categories && input.categories.length > 0
        ? {
            create: input.categories.map((categoryId) => ({
              category: { connect: { id: categoryId } },
            })),
          }
        : undefined,
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
      options?: Record<string, unknown> | null;
      // Location fields
      address?: string | null;
      city?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      // Booking rules
      minBookingNoticeHours?: number | null;
      maxBookingAdvanceDays?: number | null;
      instantBooking?: boolean;
      manualApprovalRequired?: boolean;
      minRentalDurationHours?: number | null;
      maxRentalDurationDays?: number | null;
      autoAcceptBookings?: boolean;
      // Renter conditions
      minDriverAge?: number | null;
      minLicenseYears?: number | null;
    },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, hostId: true, country: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new NotFoundException('Listing not found');

    if (data.status === 'ACTIVE') {
      const countryToCheck = data.country ?? listing.country;
      if (!countryToCheck?.trim()) {
        throw new BadRequestException('Marché non ouvert : l\'annonce doit avoir un pays renseigné pour être publiée.');
      }
      const market = await this.markets.getMarketByCountryCode(countryToCheck);
      if (!market || market.status !== 'ACTIVE' || !market.visibleToClient) {
        throw new BadRequestException('Marché non ouvert, annonce enregistrée mais non publiable. Le pays doit être configuré et visible côté client.');
      }
    }

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
    if (data.options !== undefined) {
      updateData.options = data.options === null ? Prisma.JsonNull : (data.options as Prisma.InputJsonValue);
    }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.minBookingNoticeHours !== undefined) updateData.minBookingNoticeHours = data.minBookingNoticeHours;
    if (data.maxBookingAdvanceDays !== undefined) updateData.maxBookingAdvanceDays = data.maxBookingAdvanceDays;
    if (data.instantBooking !== undefined) updateData.instantBooking = data.instantBooking;
    if (data.manualApprovalRequired !== undefined) updateData.manualApprovalRequired = data.manualApprovalRequired;
    if (data.minRentalDurationHours !== undefined) updateData.minRentalDurationHours = data.minRentalDurationHours;
    if (data.maxRentalDurationDays !== undefined) updateData.maxRentalDurationDays = data.maxRentalDurationDays;
    if (data.autoAcceptBookings !== undefined) updateData.autoAcceptBookings = data.autoAcceptBookings;
    if (data.minDriverAge !== undefined) updateData.minDriverAge = data.minDriverAge;
    if (data.minLicenseYears !== undefined) updateData.minLicenseYears = data.minLicenseYears;

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

  async updateVehicle(
    hostId: string,
    listingId: string,
    data: {
      powerCv?: number | null;
      batteryKwh?: number | null;
      topSpeedKmh?: number | null;
      zeroTo100S?: number | null;
      powerKw?: number | null;
      registrationCountry?: string | null;
      licensePlate?: string | null;
      fiscalPower?: number | null;
      ownerType?: 'PARTICULAR' | 'PROFESSIONAL' | null;
    },
  ): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, hostId: true, vehicleId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new NotFoundException('Listing not found');
    if (!listing.vehicleId) throw new BadRequestException('Listing has no vehicle');

    const updated = await this.vehicle.updateVehicleSpecsAndAdmin(listing.vehicleId, {
      ...data,
      ownerType: data.ownerType as never,
    });
    return updated;
  }

  async addPhoto(listingId: string, hostId: string, url: string, order?: number): Promise<unknown> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, hostId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new NotFoundException('Listing not found');

    const maxOrder = await this.prisma.listingPhoto.findFirst({
      where: { listingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const photoOrder = order ?? (maxOrder?.order ?? -1) + 1;

    const photo = await this.prisma.listingPhoto.create({
      data: {
        listingId,
        url,
        order: photoOrder,
      },
    });

    return photo;
  }

  async removePhoto(listingId: string, hostId: string, photoId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, hostId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new NotFoundException('Listing not found');

    const photo = await this.prisma.listingPhoto.findUnique({
      where: { id: photoId },
      select: { listingId: true },
    });
    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException('Photo not found');
    }

    await this.prisma.listingPhoto.delete({
      where: { id: photoId },
    });
  }

  async reorderPhotos(listingId: string, hostId: string, photoIds: string[]): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, hostId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new NotFoundException('Listing not found');

    // Verify all photos belong to this listing
    const photos = await this.prisma.listingPhoto.findMany({
      where: { listingId, id: { in: photoIds } },
      select: { id: true },
    });
    if (photos.length !== photoIds.length) {
      throw new BadRequestException('Some photos do not belong to this listing');
    }

    // Update order for each photo
    await Promise.all(
      photoIds.map((photoId, index) =>
        this.prisma.listingPhoto.update({
          where: { id: photoId },
          data: { order: index },
        }),
      ),
    );
  }

  /** Calculate price for a listing with given start and end dates, taking into account hourly rates and multi-day discounts */
  /** Find a city by name (slug or name in en/fr). Returns coordinates if found. */
  async findCityByName(query: string): Promise<{ id: string; slug: string; name: Record<string, string>; latitude: number; longitude: number } | null> {
    const queryLower = query.toLowerCase().trim();
    
    // Use raw SQL for robust JSONB search
    const cities = await this.prisma.$queryRaw<Array<{ id: string; slug: string; name: Record<string, string>; latitude: number; longitude: number }>>`
      SELECT id, slug, name, latitude, longitude
      FROM "City"
      WHERE 
        LOWER(slug) = ${queryLower}
        OR LOWER(slug) LIKE ${`%${queryLower}%`}
        OR LOWER(name->>'en') LIKE ${`%${queryLower}%`}
        OR LOWER(name->>'fr') LIKE ${`%${queryLower}%`}
      ORDER BY 
        CASE WHEN LOWER(slug) = ${queryLower} THEN 1 ELSE 2 END,
        CASE WHEN LOWER(slug) LIKE ${`${queryLower}%`} THEN 1 ELSE 2 END
      LIMIT 1
    `;
    
    const city = cities[0];
    if (!city || city.latitude == null || city.longitude == null) {
      return null;
    }
    
    return city;
  }

  async calculatePrice(
    idOrSlug: string,
    startAt: Date,
    endAt: Date,
  ): Promise<{ basePrice: number; discount: number; finalPrice: number; isHourly: boolean; hours: number; days: number; discountThreshold: number | null }> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: 'ACTIVE',
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const durationMs = endAt.getTime() - startAt.getTime();
    const hours = Math.ceil(durationMs / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);

    // Extract pricing options
    const options = listing.options as { pricing?: { hourlyAllowed?: boolean; pricePerHour?: number | null; durationDiscount3Days?: number | null; durationDiscount7Days?: number | null; durationDiscount30Days?: number | null } } | null;
    const pricing = options?.pricing;
    const hourlyAllowed = pricing?.hourlyAllowed === true;
    const pricePerHour = pricing?.pricePerHour ?? null;
    const pricePerDay = listing.pricePerDay?.toNumber() ?? 0;

    let basePrice: number;
    let isHourly = false;

    // Determine if we should use hourly pricing
    if (hourlyAllowed && pricePerHour != null && pricePerHour > 0) {
      // Use hourly pricing
      basePrice = pricePerHour * hours;
      isHourly = true;
    } else if (pricePerDay > 0) {
      // Use daily pricing
      basePrice = pricePerDay * days;
    } else {
      throw new BadRequestException('Listing has no valid pricing');
    }

    // Apply multi-day discounts based on days (even for hourly rentals)
    let discount = 0;
    let discountThreshold: number | null = null;
    const discount30Days = pricing?.durationDiscount30Days ?? null;
    const discount7Days = pricing?.durationDiscount7Days ?? null;
    const discount3Days = pricing?.durationDiscount3Days ?? null;

    if (days >= 30 && discount30Days != null && discount30Days > 0) {
      discount = discount30Days;
      discountThreshold = 30;
    } else if (days >= 7 && discount7Days != null && discount7Days > 0) {
      discount = discount7Days;
      discountThreshold = 7;
    } else if (days >= 3 && discount3Days != null && discount3Days > 0) {
      discount = discount3Days;
      discountThreshold = 3;
    }

    const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

    return {
      basePrice: Math.max(0, basePrice),
      discount,
      finalPrice: Math.max(0, finalPrice),
      isHourly,
      hours,
      days,
      discountThreshold,
    };
  }
}
