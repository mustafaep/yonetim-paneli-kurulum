import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../services/email.service';
import { SmsService } from '../services/sms.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

export interface NotificationJobData {
  notificationId: string;
  type: NotificationType;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
}

@Processor('notifications')
@Injectable()
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
    private whatsAppService: WhatsAppService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const {
      notificationId,
      type,
      recipientId,
      recipientEmail,
      recipientPhone,
      title,
      message,
    } = job.data;

    try {
      switch (type) {
        case NotificationType.EMAIL:
          if (!recipientEmail) {
            throw new Error(
              'Email recipient is required for EMAIL notification',
            );
          }
          await this.emailService.sendEmail({
            to: recipientEmail,
            subject: title,
            html: message,
          });
          break;

        case NotificationType.SMS:
          if (!recipientPhone) {
            throw new Error('Phone number is required for SMS notification');
          }
          await this.smsService.sendSms({
            to: recipientPhone,
            message: `${title}\n\n${message}`,
          });
          break;

        case NotificationType.IN_APP:
          if (!recipientId) {
            throw new Error('Recipient ID is required for IN_APP notification');
          }
          // Web içi bildirim kaydı oluştur
          await this.prisma.userNotification.upsert({
            where: {
              userId_notificationId: {
                userId: recipientId,
                notificationId,
              },
            },
            create: {
              userId: recipientId,
              notificationId,
              isRead: false,
            },
            update: {
              isRead: false,
            },
          });
          break;

        case NotificationType.WHATSAPP:
          if (!recipientPhone) {
            throw new Error(
              'Phone number is required for WHATSAPP notification',
            );
          }
          await this.whatsAppService.sendText(
            recipientPhone,
            `${title}\n\n${message}`,
          );
          break;

        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }

      this.logger.log(
        `Notification ${notificationId} sent successfully (type: ${type})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send notification ${notificationId}: ${error.message}`,
        error.stack,
      );
      throw error; // Job retry için
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
