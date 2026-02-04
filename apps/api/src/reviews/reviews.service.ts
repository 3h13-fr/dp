import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findForListing(listingId: string, limit = 20) {
    return this.prisma.review.findMany({
      where: { listingId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getListingStats(listingId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: true,
    });
    return { average: agg._avg.rating ?? 0, count: agg._count };
  }
}
