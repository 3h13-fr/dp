import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, MarketStatus } from 'database';
import { AdminMarketsService, type CreateMarketDto, type UpdateMarketDto } from './admin-markets.service';

@Controller('admin/markets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminMarketsController {
  constructor(private markets: AdminMarketsService) {}

  @Get()
  getMarkets(
    @Query('search') search?: string,
    @Query('status') status?: MarketStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.markets.findAll({
      search,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  getMarketById(@Param('id') id: string) {
    return this.markets.findById(id);
  }

  @Post()
  createMarket(@Body() body: CreateMarketDto) {
    return this.markets.create(body);
  }

  @Patch(':id')
  updateMarket(@Param('id') id: string, @Body() body: UpdateMarketDto) {
    return this.markets.update(id, body);
  }

  @Post(':id/duplicate')
  duplicateMarket(@Param('id') id: string) {
    return this.markets.duplicate(id);
  }
}
