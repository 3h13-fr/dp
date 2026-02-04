import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export const BOOKING_ROOM = (id: string) => `booking:${id}`;
export const USER_ROOM = (id: string) => `user:${id}`;

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'] },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: any) {
    const token =
      client.handshake?.auth?.token ??
      client.handshake?.query?.token ??
      client.handshake?.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const secret = this.config.get<string>('JWT_SECRET', 'change-me-in-production');
      const payload = this.jwt.verify(token, { secret });
      client.data.userId = payload.sub;
      client.join(USER_ROOM(payload.sub));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: any) {}

  @SubscribeMessage('join_booking')
  async handleJoinBooking(client: any, payload: { bookingId: string }) {
    const userId = client.data?.userId;
    if (!userId || !payload?.bookingId) return;

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: payload.bookingId,
        OR: [{ guestId: userId }, { hostId: userId }],
      },
    });
    if (!booking) return;

    client.join(BOOKING_ROOM(payload.bookingId));
  }

  /** Emit new message to booking room (call from MessagesService after persist) */
  emitMessageToBooking(bookingId: string | null, message: Record<string, unknown>) {
    if (!bookingId) return;
    this.server.to(BOOKING_ROOM(bookingId)).emit('message', message);
  }

  /** Emit booking status update to booking room and to guest/host user rooms */
  emitBookingStatus(bookingId: string, status: string, payload?: Record<string, unknown>) {
    this.server.to(BOOKING_ROOM(bookingId)).emit('booking_status', { bookingId, status, ...payload });
  }

  /** Emit notification to a user */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(USER_ROOM(userId)).emit(event, data);
  }
}
