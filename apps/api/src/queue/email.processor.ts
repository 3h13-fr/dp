import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailJobData } from './queue.service';

const fallbackLocale = 'en';

function renderBookingConfirmation(locale: string, variables: Record<string, string> | undefined): { subject: string; html: string } {
  const lang = locale === 'fr' ? 'fr' : fallbackLocale;
  const bookingId = variables?.bookingId ?? '';
  if (lang === 'fr') {
    return {
      subject: 'Réservation confirmée',
      html: `<p>Votre réservation a bien été confirmée.</p><p>Référence : <strong>${bookingId}</strong></p><p>Consultez le détail dans vos réservations.</p>`,
    };
  }
  return {
    subject: 'Booking confirmed',
    html: `<p>Your booking has been confirmed.</p><p>Reference: <strong>${bookingId}</strong></p><p>View details in your trips.</p>`,
  };
}

function renderBookingCancelled(locale: string, variables: Record<string, string> | undefined): { subject: string; html: string } {
  const lang = locale === 'fr' ? 'fr' : fallbackLocale;
  const bookingId = variables?.bookingId ?? '';
  if (lang === 'fr') {
    return {
      subject: 'Réservation annulée',
      html: `<p>Votre réservation a été annulée.</p><p>Référence : <strong>${bookingId}</strong></p><p>Un remboursement sera effectué si la réservation avait été payée.</p>`,
    };
  }
  return {
    subject: 'Booking cancelled',
    html: `<p>Your booking has been cancelled.</p><p>Reference: <strong>${bookingId}</strong></p><p>A refund will be issued if the booking was paid.</p>`,
  };
}

function renderNewMessage(locale: string, variables: Record<string, string> | undefined): { subject: string; html: string } {
  const lang = locale === 'fr' ? 'fr' : fallbackLocale;
  const senderName = variables?.senderName ?? 'Someone';
  const preview = (variables?.bodyPreview ?? '').slice(0, 80);
  if (lang === 'fr') {
    return {
      subject: `Nouveau message de ${senderName}`,
      html: `<p>Vous avez reçu un nouveau message de ${senderName}.</p><p>${preview ? `« ${preview}${preview.length >= 80 ? '…' : ''} »` : ''}</p><p>Répondez depuis l'onglet Messages de votre compte.</p>`,
    };
  }
  return {
    subject: `New message from ${senderName}`,
    html: `<p>You have a new message from ${senderName}.</p><p>${preview ? `"${preview}${preview.length >= 80 ? '…' : ''}"` : ''}</p><p>Reply from the Messages section of your account.</p>`,
  };
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    super();
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 1025);
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: false,
        auth:
          this.config.get<string>('SMTP_USER') && this.config.get<string>('SMTP_PASS')
            ? {
                user: this.config.get<string>('SMTP_USER'),
                pass: this.config.get<string>('SMTP_PASS'),
              }
            : undefined,
      });
      this.logger.log(`SMTP configured: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP_HOST not set — emails will be logged only');
    }
  }

  async process(job: Job<EmailJobData, void, string>): Promise<void> {
    const { to, subject: subjectIn, template, locale, variables } = job.data;
    const effectiveLocale = locale ?? 'en';

    let subject = subjectIn;
    let html: string;

    if (template === 'booking-confirmation') {
      const rendered = renderBookingConfirmation(effectiveLocale, variables);
      subject = rendered.subject;
      html = rendered.html;
    } else if (template === 'booking-cancelled') {
      const rendered = renderBookingCancelled(effectiveLocale, variables);
      subject = rendered.subject;
      html = rendered.html;
    } else if (template === 'new-message') {
      const rendered = renderNewMessage(effectiveLocale, variables);
      subject = rendered.subject;
      html = rendered.html;
    } else {
      html = `<p>${subject}</p>`;
      if (variables && Object.keys(variables).length > 0) {
        html += `<pre>${JSON.stringify(variables)}</pre>`;
      }
    }

    this.logger.log(`[Email] ${template ?? 'raw'} → ${to} (${effectiveLocale})`);

    if (!this.transporter) {
      this.logger.debug(`Would send: ${subject} to ${to}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@localhost'),
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
      throw err;
    }
  }
}
