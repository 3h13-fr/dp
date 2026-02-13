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

  /** Booking confirmation email (locale = guest preferredLang, fallback EN). */
  async enqueueBookingConfirmationEmail(bookingId: string, guestEmail: string, locale = 'en') {
    return this.addEmail({
      to: guestEmail,
      subject: locale === 'fr' ? 'Réservation confirmée' : 'Booking confirmed',
      template: 'booking-confirmation',
      locale,
      variables: { bookingId },
    });
  }

  /** Booking cancelled email (refund info). */
  async enqueueBookingCancelledEmail(bookingId: string, guestEmail: string, locale = 'en') {
    return this.addEmail({
      to: guestEmail,
      subject: locale === 'fr' ? 'Réservation annulée' : 'Booking cancelled',
      template: 'booking-cancelled',
      locale,
      variables: { bookingId },
    });
  }

  /** New message notification email (receiver's locale). */
  async enqueueNewMessageEmail(toEmail: string, senderName: string, bodyPreview: string, locale = 'en') {
    return this.addEmail({
      to: toEmail,
      subject: locale === 'fr' ? `Nouveau message de ${senderName}` : `New message from ${senderName}`,
      template: 'new-message',
      locale,
      variables: { senderName, bodyPreview },
    });
  }

  /** OTP code email (passwordless login). */
  async enqueueOtpEmail(toEmail: string, code: string, locale = 'en') {
    return this.addEmail({
      to: toEmail,
      subject: locale === 'fr' ? 'Votre code de connexion' : 'Your login code',
      template: 'otp',
      locale,
      variables: { code },
    });
  }

  /** Password reset email (link to set new password). */
  async enqueuePasswordResetEmail(toEmail: string, resetLink: string, locale = 'en') {
    return this.addEmail({
      to: toEmail,
      subject: locale === 'fr' ? 'Réinitialiser votre mot de passe' : 'Reset your password',
      template: 'password-reset',
      locale,
      variables: { resetLink },
    });
  }

  /** In-app notification (e.g. new message). */
  async enqueueNotification(userId: string, type: string, title: string, body?: string, data?: Record<string, unknown>) {
    return this.addNotification({ userId, type, title, body, data });
  }

  /** Host approval notification email (for manual bookings). */
  async enqueueHostApprovalNotification(bookingId: string, hostEmail: string, approvalDeadline: Date | null, locale = 'en') {
    return this.addEmail({
      to: hostEmail,
      subject: locale === 'fr' ? 'Réservation en attente d\'approbation' : 'Booking pending approval',
      template: 'host-approval-required',
      locale,
      variables: {
        bookingId,
        approvalDeadline: approvalDeadline ? approvalDeadline.toISOString() : '',
      },
    });
  }
}
