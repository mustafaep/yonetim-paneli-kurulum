import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { ConfigService } from '../../config/config.service';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient | undefined;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Güvenlik: AWS SES sırları yalnızca .env üzerinden okunur, DB'de tutulmaz.
      const accessKeyId = this.configService.awsSesAccessKeyId;
      const secretAccessKey = this.configService.awsSesSecretAccessKey;
      const region = this.configService.awsSesRegion;

      if (!accessKeyId || !secretAccessKey) {
        this.logger.warn(
          'AWS SES credentials not configured. Email sending will be disabled.',
        );
        this.sesClient = undefined;
      } else {
        this.sesClient = new SESClient({
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
      }

      this.fromEmail =
        this.configService.awsSesFromEmail || 'noreply@example.com';
    } catch (error) {
      this.logger.error('Error initializing email client:', error);
      this.sesClient = undefined;
    }
  }

  async refreshConfig() {
    this.initializeClient();
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    // Email gönderimi aktif mi kontrol et (önce NOTIFICATION_EMAIL_ENABLED, sonra EMAIL_ENABLED)
    const notificationEmailEnabled = this.configService.getSystemSettingBoolean(
      'NOTIFICATION_EMAIL_ENABLED',
      true,
    );
    const emailEnabled = this.configService.getSystemSettingBoolean(
      'EMAIL_ENABLED',
      true,
    );

    if (!notificationEmailEnabled) {
      this.logger.warn(
        'Email notifications are disabled in notification settings.',
      );
      return;
    }

    if (!emailEnabled) {
      this.logger.warn('Email sending is disabled in system settings.');
      return;
    }

    if (!this.sesClient) {
      this.logger.warn('AWS SES client not initialized. Email not sent.');
      return;
    }

    const { to, subject, html, from } = options;
    const recipients = Array.isArray(to) ? to : [to];
    const sender = from || this.fromEmail;

    try {
      const command = new SendEmailCommand({
        Source: sender,
        Destination: {
          ToAddresses: recipients,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
          },
        },
      });

      const response = await this.sesClient.send(command);
      this.logger.log(
        `Email sent successfully. MessageId: ${response.MessageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendBulkEmails(emails: SendEmailOptions[]): Promise<void> {
    // AWS SES bulk email gönderimi için ayrı bir metod
    // Şimdilik tek tek gönderiyoruz, gelecekte batch API kullanılabilir
    const results = await Promise.allSettled(
      emails.map((email) => this.sendEmail(email)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `${failed.length} emails failed to send out of ${emails.length}`,
      );
    }
  }
}
