import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
      category?: string;
      transmission?: string;
      fuelType?: string;
      status?: string;
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
      category: body.category,
      transmission: body.transmission,
      fuelType: body.fuelType,
      status: body.status,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  myListings(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.listings.findForHost(
      user.id,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Get()
  findMany(
    @Query('type') type?: ListingType,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
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
      });
    }
    return this.listings.findMany({
      type,
      city,
      country,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.listings.findOne(id);
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
    },
  ): Promise<unknown> {
    return this.listings.update(user.id, id, body);
  }
}
