import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'database';

class SendMessageDto {
  @IsString()
  bookingId: string;

  @IsString()
  @MinLength(1, { message: 'Message cannot be empty' })
  body: string;
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

  /** Thread for one booking. Requires bookingId. User must be guest or host. */
  @UseGuards(AuthGuard('jwt'))
  @Get('thread')
  thread(
    @CurrentUser() user: User,
    @Query('bookingId') bookingId: string,
  ) {
    if (!bookingId) throw new BadRequestException('bookingId required');
    return this.messages.findThreadByBooking(bookingId, user.id);
  }

  /** Send message in a booking thread. Receiver is inferred (other party). */
  @UseGuards(AuthGuard('jwt'))
  @Post('send')
  send(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.messages.sendMessageForBooking(user.id, dto.bookingId, dto.body);
  }
}
