import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export type EmailJobData = {
  to: string;
  subject: string;
  template: string;
  locale?: string;
  variables?: Record<string, string>;
};

export type NotificationJobData = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
  ) {}

  async addEmail(data: EmailJobData, opts?: { delay?: number }) {
    return this.emailQueue.add('send', data, opts);
  }

  async addNotification(data: NotificationJobData, opts?: { delay?: number }) {
    return this.notificationQueue.add('push', data, opts);
  }

  /** Example: enqueue booking confirmation email */
  async enqueueBookingConfirmationEmail(bookingId: string, guestEmail: string, locale = 'en') {
    return this.addEmail({
      to: guestEmail,
      subject: locale === 'fr' ? 'Réservation confirmée' : 'Booking confirmed',
      template: 'booking-confirmation',
      locale,
      variables: { bookingId },
    });
  }

  /** Example: enqueue in-app notification for new message */
  async enqueueNotification(userId: string, type: string, title: string, body?: string, data?: Record<string, unknown>) {
    return this.addNotification({ userId, type, title, body, data });
  }
}
