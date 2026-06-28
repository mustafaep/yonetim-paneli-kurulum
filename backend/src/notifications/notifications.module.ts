import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '../config/config.module.js';
import { MembersModule } from '../members/members.module';
import { NotificationProcessor } from './processors/notification.processor';
import {
  NotificationQueue,
  NOTIFICATION_QUEUE_NAME,
} from './queues/notification.queue';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { WhatsAppService } from './services/whatsapp.service';
import { WhatsAppChatService } from './services/whatsapp-chat.service';
import { WhatsAppTemplateService } from './services/whatsapp-template.service';
import { ConfigService } from '../config/config.service.js';
import { NotificationApplicationService } from './application/services/notification-application.service';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { NotificationRepository } from './domain/repositories/notification.repository.interface';
import { NotificationExceptionFilter } from './presentation/filters/notification-exception.filter';
import { NotificationValidationPipe } from './presentation/pipes/notification-validation.pipe';
import { WhatsAppController } from './presentation/controllers/whatsapp.controller';
import { WhatsAppWebhookController } from './presentation/controllers/whatsapp-webhook.controller';
import { SmsController } from './presentation/controllers/sms.controller';
import { EmailController } from './presentation/controllers/email.controller';
import { SmsTemplateService } from './services/sms-template.service';
import { EmailTemplateService } from './services/email-template.service';

const isRedisEnabled =
  (process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true' ||
  process.env.REDIS_ENABLED === '1';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => MembersModule),
    ...(isRedisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              connection: {
                host: configService.redisHost,
                port: configService.redisPort,
                password: configService.redisPassword,
                maxRetriesPerRequest: null, // BullMQ requires this to be null
                retryStrategy: (times) => {
                  // Exponential backoff with max delay
                  const delay = Math.min(times * 50, 5000);
                  return delay;
                },
                enableOfflineQueue: false, // Redis yoksa job'ları queue'ya ekleme
              },
            }),
          }),
          BullModule.registerQueue({
            name: NOTIFICATION_QUEUE_NAME,
          }),
        ]
      : []),
  ],
  controllers: [NotificationsController, WhatsAppController, WhatsAppWebhookController, SmsController, EmailController],
  providers: [
    NotificationsService,
    ...(isRedisEnabled ? [NotificationProcessor] : []),
    NotificationQueue,
    EmailService,
    SmsService,
    WhatsAppService,
    WhatsAppChatService,
    WhatsAppTemplateService,
    SmsTemplateService,
    EmailTemplateService,
    NotificationApplicationService,
    {
      provide: 'NotificationRepository',
      useClass: PrismaNotificationRepository,
    },
    PrismaNotificationRepository,
    NotificationExceptionFilter,
    NotificationValidationPipe,
  ],
  exports: [
    NotificationsService,
    NotificationQueue,
    WhatsAppService,
    WhatsAppTemplateService,
    EmailService,
    SmsTemplateService,
    EmailTemplateService,
  ],
})
export class NotificationsModule {}
