import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListingsService } from './listings.service';
import { ListingType } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

@Controller('listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

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
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.listings.findOne(id);
  }
}
