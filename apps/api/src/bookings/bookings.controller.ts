import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsISO8601, IsOptional, IsObject, MinLength } from 'class-validator';
import { BookingsService } from './bookings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';
import { BookingStatus } from 'database';

class CreateBookingDto {
  @IsString()
  listingId: string;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

class ReportIssueDto {
  @IsString()
  @MinLength(1, { message: 'Message is required' })
  message: string;
}

@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto): Promise<unknown> {
    return this.bookings.create(user.id, {
      listingId: dto.listingId,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      options: dto.options,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  myBookings(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.bookings.findForGuest(
      user.id,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('host')
  hostBookings(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: unknown[]; total: number }> {
    return this.bookings.findForHost(
      user.id,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string): Promise<unknown> {
    return this.bookings.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { status: BookingStatus },
  ): Promise<unknown> {
    return this.bookings.updateStatus(id, body.status, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/report-issue')
  reportIssue(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: ReportIssueDto,
  ): Promise<{ received: boolean }> {
    return this.bookings.reportIssue(id, user.id, body.message ?? '');
  }
}
