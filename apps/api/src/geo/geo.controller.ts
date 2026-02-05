import { Controller, Get, Param, Query } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private geo: GeoService) {}

  @Get('countries')
  getCountries(): Promise<unknown[]> {
    return this.geo.findCountries();
  }

  @Get('countries/:countryId/regions')
  getRegions(@Param('countryId') countryId: string): Promise<unknown[]> {
    return this.geo.findRegionsByCountry(countryId);
  }

  @Get('countries/:countryId/cities')
  getCities(
    @Param('countryId') countryId: string,
    @Query('limit') limit?: string
  ): Promise<unknown[]> {
    const l = limit ? parseInt(limit, 10) : 500;
    return this.geo.findCitiesByCountry(countryId, l);
  }

  @Get('cities/:countrySlug/:citySlug')
  getCityBySlug(
    @Param('countrySlug') countrySlug: string,
    @Param('citySlug') citySlug: string
  ): Promise<unknown | null> {
    return this.geo.findCityBySlug(countrySlug, citySlug);
  }
}
