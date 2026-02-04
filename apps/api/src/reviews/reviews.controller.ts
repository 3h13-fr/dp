import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('listings')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get(':listingId/reviews')
  forListing(
    @Param('listingId') listingId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviews.findForListing(
      listingId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get(':listingId/reviews/stats')
  stats(@Param('listingId') listingId: string) {
    return this.reviews.getListingStats(listingId);
  }
}
