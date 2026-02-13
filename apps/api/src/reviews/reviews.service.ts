import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from 'database';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /** Create a review for a completed booking. Caller must be the guest; subject is the host. */
  async createForBooking(
    bookingId: string,
    authorId: string,
    data: { rating: number; comment?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== authorId) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed bookings');
    }
    if (booking.review) throw new BadRequestException('This booking already has a review');

    const rating = Math.round(Number(data.rating));
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating must be between 1 and 5');

    return this.prisma.review.create({
      data: {
        bookingId,
        listingId: booking.listingId,
        authorId,
        subjectId: booking.hostId,
        rating,
        comment: data.comment?.trim() || null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

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
