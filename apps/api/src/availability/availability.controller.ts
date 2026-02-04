import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AvailabilityService } from './availability.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { User } from 'database';
import { Role } from 'database';

class SetAvailabilityDto {
  dates: { date: string; available: boolean; priceOverride?: number }[];
}

@Controller('availability/listings/:listingId')
export class AvailabilityController {
  constructor(private availability: AvailabilityService) {}

  @Get()
  get(
    @Param('listingId') listingId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<{ date: string; available: boolean; priceOverride: number | null }[]> {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    return this.availability.getForListing(listingId, fromDate, toDate);
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.HOST)
  set(
    @Param('listingId') listingId: string,
    @CurrentUser() user: User,
    @Body() dto: SetAvailabilityDto,
  ): Promise<{ updated: number }> {
    return this.availability.setForListing(listingId, user.id, dto.dates ?? []);
  }
}
