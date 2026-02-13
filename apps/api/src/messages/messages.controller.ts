import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, MinLength, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

class AttachmentUrlDto {
  @IsString()
  url: string;

  @IsIn(['image', 'file'])
  type: 'image' | 'file';

  @IsOptional()
  @IsString()
  filename?: string;
}

class SendMessageDto {
  @IsString()
  bookingId: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentUrlDto)
  attachmentUrls?: AttachmentUrlDto[];
}

@Controller('messages')
export class MessagesController {
  constructor(private messages: MessagesService) {}

  /** List conversations: one per booking (guest + host). Like Airbnb: reservation = private thread. */
  @UseGuards(AuthGuard('jwt'))
  @Get('conversations')
  conversations(@CurrentUser() user: User) {
    return this.messages.findConversations(user.id);
  }

  /** Thread: use bookingId=drivepark for DrivePark (general notifications), otherwise booking thread (messages + reservation notifications). */
  @UseGuards(AuthGuard('jwt'))
  @Get('thread')
  async thread(
    @CurrentUser() user: User,
    @Query('bookingId') bookingId: string,
  ) {
    if (!bookingId) throw new BadRequestException('bookingId required');
    if (bookingId === 'drivepark') return this.messages.findDriveParkThread(user.id);
    return this.messages.findThreadByBooking(bookingId, user.id);
  }

  /** Send message in a booking thread. Receiver is inferred (other party). */
  @UseGuards(AuthGuard('jwt'))
  @Post('send')
  send(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.messages.sendMessageForBooking(user.id, dto.bookingId, dto.body ?? '', dto.attachmentUrls);
  }
}
