import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListingsService } from './listings.service';
import { ListingType } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

@Controller('listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: User,
    @Body()
    body: {
      type: ListingType;
      title?: string;
      vehicleId?: string;
      seats?: number;
      doors?: number;
      luggage?: number;
      cityId?: string;
      city?: string;
      country?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      pricePerDay?: number;
      currency?: string;
      caution?: number;
      description?: string;
      categories?: string[]; // Array of category IDs
      transmission?: string;
      fuelType?: string;
      status?: string;
      options?: Record<string, unknown>;
      // Booking rules
      minBookingNoticeHours?: number;
      maxBookingAdvanceDays?: number;
      instantBooking?: boolean;
      manualApprovalRequired?: boolean;
      minRentalDurationHours?: number;
      maxRentalDurationDays?: number;
      autoAcceptBookings?: boolean;
      // Renter conditions
      minDriverAge?: number;
      minLicenseYears?: number;
    },
  ) {
    return this.listings.create({
      hostId: user.id,
      type: body.type,
      title: body.title,
      vehicleId: body.vehicleId,
      seats: body.seats ?? 0,
      doors: body.doors,
      luggage: body.luggage,
      cityId: body.cityId,
      city: body.city,
      country: body.country,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      pricePerDay: body.pricePerDay,
      currency: body.currency,
      caution: body.caution,
      description: body.description,
      categories: body.categories,
      transmission: body.transmission,
      fuelType: body.fuelType,
      status: body.status,
      options: body.options,
      // Booking rules
      minBookingNoticeHours: body.minBookingNoticeHours,
      maxBookingAdvanceDays: body.maxBookingAdvanceDays,
      instantBooking: body.instantBooking,
      manualApprovalRequired: body.manualApprovalRequired,
      minRentalDurationHours: body.minRentalDurationHours,
      maxRentalDurationDays: body.maxRentalDurationDays,
      autoAcceptBookings: body.autoAcceptBookings,
      // Renter conditions
      minDriverAge: body.minDriverAge,
      minLicenseYears: body.minLicenseYears,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  myListings(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: ListingType,
    @Query('status') status?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.listings.findForHost(
      user.id,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
      type,
      status,
    );
  }

  @Get(':id/price')
  calculatePrice(
    @Param('id') id: string,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ): Promise<{ basePrice: number; discount: number; finalPrice: number; isHourly: boolean; hours: number; days: number; discountThreshold: number | null }> {
    if (!startAt || !endAt) {
      throw new BadRequestException('startAt and endAt query parameters are required');
    }
    return this.listings.calculatePrice(id, new Date(startAt), new Date(endAt));
  }

  @Get()
  findMany(
    @Query('type') type?: ListingType,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('transmission') transmission?: string,
    @Query('fuelType') fuelType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    const latitude = lat ? parseFloat(lat) : undefined;
    const longitude = lng ? parseFloat(lng) : undefined;
    if (latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
      return this.listings.searchByLocation({
        latitude,
        longitude,
        radiusMeters: radius ? parseInt(radius, 10) : undefined,
        type,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        city: city, // Passer city pour le fallback si PostGIS échoue
        startAt: startAt,
        endAt: endAt,
        category: category,
      });
    }
    // Parse radius if provided (in meters from URL, convert to km for findMany)
    const radiusKm = radius ? parseFloat(radius) / 1000 : undefined;
    
    return this.listings.findMany({
      type,
      city,
      country,
      category,
      transmission: transmission?.trim() || undefined,
      fuelType: fuelType?.trim() || undefined,
      sortBy: sortBy?.trim() || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      radiusKm: radiusKm && !Number.isNaN(radiusKm) ? radiusKm : undefined,
      startAt: startAt,
      endAt: endAt,
    });
  }

  @Get('cities/search')
  async searchCity(@Query('q') query?: string) {
    if (!query) {
      throw new BadRequestException('Query parameter q is required');
    }
    
    const city = await this.listings.findCityByName(query);
    if (!city) {
      throw new NotFoundException(`City "${query}" not found`);
    }
    
    return {
      id: city.id,
      slug: city.slug,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.listings.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/vehicle')
  updateVehicle(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.listings.updateVehicle(user.id, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.listings.update(user.id, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/photos')
  addPhoto(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { url: string; order?: number },
  ): Promise<unknown> {
    return this.listings.addPhoto(id, user.id, body.url, body.order);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/photos/:photoId')
  removePhoto(@CurrentUser() user: User, @Param('id') id: string, @Param('photoId') photoId: string): Promise<void> {
    return this.listings.removePhoto(id, user.id, photoId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/photos/reorder')
  reorderPhotos(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { photoIds: string[] },
  ): Promise<void> {
    return this.listings.reorderPhotos(id, user.id, body.photoIds);
  }
}
