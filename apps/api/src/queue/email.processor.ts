import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailJobData } from './queue.service';

function renderBookingConfirmation(locale: string, variables: Record<string, string> | undefined): { subject: string; html: string } {
  const bookingId = variables?.bookingId ?? '';
  if (locale === 'fr') {
    return {
      subject: 'Réservation confirmée',
      html: `
        <p>Votre réservation a bien été confirmée.</p>
        <p>Référence : <strong>${bookingId}</strong></p>
        <p>Vous pouvez consulter le détail dans votre espace réservations.</p>
      `.trim(),
    };
  }
  return {
    subject: 'Booking confirmed',
    html: `
      <p>Your booking has been confirmed.</p>
      <p>Reference: <strong>${bookingId}</strong></p>
      <p>You can view the details in your bookings area.</p>
    `.trim(),
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
