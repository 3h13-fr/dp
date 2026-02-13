import { Controller, Get } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(private markets: MarketsService) {}

  @Get('active-visible')
  getActiveVisible() {
    return this.markets.getActiveVisible();
  }
}
