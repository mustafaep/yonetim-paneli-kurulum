import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './application/dto/create-notification.dto';
import {
  NotificationStatus,
  NotificationTargetType,
  NotificationType,
  MemberStatus,
} from '@prisma/client';
import { NotificationQueue } from './queues/notification.queue';
import { NotificationJobData } from './processors/notification.processor';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { ConfigService } from '../config/config.service';
import { MemberScopeService } from '../members/member-scope.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { NotificationApplicationService } from './application/services/notification-application.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationQueue: NotificationQueue,
    private emailService: EmailService,
    private smsService: SmsService,
    private configService: ConfigService,
    private memberScopeService: MemberScopeService,
    private notificationApplicationService: NotificationApplicationService,
  ) {}

  async findAll(params?: {
    status?: NotificationStatus;
    targetType?: NotificationTargetType;
    limit?: number;
    offset?: number;
  }) {
    const { limit = 25, offset = 0, status, targetType } = params || {};

    const where: any = {};
    if (status) where.status = status;
    if (targetType) where.targetType = targetType;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          sentByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      limit,
      offset,
    };
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        sentByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Bildirim bulunamadı');
    }

    return notification;
  }

  async create(
    dto: CreateNotificationDto,
    userId: string,
    user?: CurrentUserData,
  ) {
    let finalMetadata = dto.metadata;

    // NOTIFY_OWN_SCOPE izni varsa ve targetType belirtilmemişse veya SCOPE ise, kullanıcının scope'unu kullan
    const hasNotifyOwnScope = user?.permissions?.includes(
      'NOTIFY_OWN_SCOPE' as any,
    );
    const hasNotifyAll = user?.permissions?.includes(
      'NOTIFY_ALL_MEMBERS' as any,
    );
    const hasNotifyRegion = user?.permissions?.includes('NOTIFY_REGION' as any);

    if (hasNotifyOwnScope && !hasNotifyAll && !hasNotifyRegion) {
      // Kullanıcının scope'unu al ve metadata'ya ekle
      if (user) {
        const scopeIds = await this.memberScopeService.getUserScopeIds(user);
        if (scopeIds.provinceId || scopeIds.districtId) {
          finalMetadata = {
            ...(finalMetadata || {}),
            scopeProvinceId: scopeIds.provinceId,
            scopeDistrictId: scopeIds.districtId,
          };
        }
      }
    }

    const notification =
      await this.notificationApplicationService.createNotification({
        dto: {
          ...dto,
          targetType:
            hasNotifyOwnScope && !hasNotifyAll && !hasNotifyRegion
              ? NotificationTargetType.SCOPE
              : dto.targetType,
        },
        userId,
        metadata: finalMetadata,
      });

    return await this.prisma.notification.findUnique({
      where: { id: notification.id },
      include: {
        sentByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async send(id: string) {
    const notification = await this.findOne(id);

    if (notification.status !== NotificationStatus.PENDING) {
      throw new Error(`Notification ${id} is not in PENDING status`);
    }

    try {
      // Hedef kullanıcıları belirle
      const recipients = await this.getRecipients(notification);

      this.logger.log(
        `Sending notification ${id} to ${recipients.length} recipients`,
      );

      // Her alıcı için job oluştur
      const jobs: Promise<any>[] = [];
      let failedJobCount = 0;

      // Redis durumunu kontrol et
      const useQueue = this.notificationQueue.redisAvailable;

      if (!useQueue) {
        this.logger.warn(
          `Redis is not available. Notification ${id} will be sent directly (synchronously) without queue.`,
        );
      }

      // Bildirim kanal ayarlarını kontrol et
      const notificationEmailEnabled =
        this.configService.getSystemSettingBoolean(
          'NOTIFICATION_EMAIL_ENABLED',
          true,
        );
      const notificationSmsEnabled = this.configService.getSystemSettingBoolean(
        'NOTIFICATION_SMS_ENABLED',
        true,
      );
      const notificationInAppEnabled =
        this.configService.getSystemSettingBoolean(
          'NOTIFICATION_IN_APP_ENABLED',
          true,
        );

      // Redis varsa queue kullan, yoksa direkt gönder
      if (useQueue) {
        // Queue kullanarak gönder (mevcut mantık)
        for (const recipient of recipients) {
          try {
            // Bildirim tipine göre job oluştur (kanal ayarlarını kontrol et)
            if (
              notification.type === NotificationType.EMAIL &&
              recipient.email &&
              notificationEmailEnabled
            ) {
              jobs.push(
                this.notificationQueue
                  .add('email', {
                    notificationId: id,
                    type: NotificationType.EMAIL,
                    recipientId: recipient.id,
                    recipientEmail: recipient.email,
                    title: notification.title,
                    message: notification.message,
                  } as NotificationJobData)
                  .catch((error) => {
                    // Redis bağlantı hatası ise daha açıklayıcı mesaj
                    if (
                      error.message?.includes('ECONNREFUSED') ||
                      error.message?.includes('Redis')
                    ) {
                      this.logger.error(
                        `Failed to add email job for recipient ${recipient.id}: Redis connection error. Ensure Redis is running.`,
                      );
                    } else {
                      this.logger.error(
                        `Failed to add email job for recipient ${recipient.id}: ${error.message}`,
                      );
                    }
                    failedJobCount++;
                    return null; // Promise'i reject etmek yerine null döndür
                  }),
              );
            } else if (
              notification.type === NotificationType.SMS &&
              recipient.phone &&
              notificationSmsEnabled
            ) {
              jobs.push(
                this.notificationQueue
                  .add('sms', {
                    notificationId: id,
                    type: NotificationType.SMS,
                    recipientId: recipient.id,
                    recipientPhone: recipient.phone,
                    title: notification.title,
                    message: notification.message,
                  } as NotificationJobData)
                  .catch((error) => {
                    if (
                      error.message?.includes('ECONNREFUSED') ||
                      error.message?.includes('Redis')
                    ) {
                      this.logger.error(
                        `Failed to add SMS job for recipient ${recipient.id}: Redis connection error. Ensure Redis is running.`,
                      );
                    } else {
                      this.logger.error(
                        `Failed to add SMS job for recipient ${recipient.id}: ${error.message}`,
                      );
                    }
                    failedJobCount++;
                    return null;
                  }),
              );
            } else if (
              notification.type === NotificationType.IN_APP &&
              notificationInAppEnabled
            ) {
              // Web içi bildirim için UserNotification kaydı oluştur
              jobs.push(
                this.notificationQueue
                  .add('in-app', {
                    notificationId: id,
                    type: NotificationType.IN_APP,
                    recipientId: recipient.id,
                    title: notification.title,
                    message: notification.message,
                  } as NotificationJobData)
                  .catch((error) => {
                    if (
                      error.message?.includes('ECONNREFUSED') ||
                      error.message?.includes('Redis')
                    ) {
                      this.logger.error(
                        `Failed to add in-app job for recipient ${recipient.id}: Redis connection error. Ensure Redis is running.`,
                      );
                    } else {
                      this.logger.error(
                        `Failed to add in-app job for recipient ${recipient.id}: ${error.message}`,
                      );
                    }
                    failedJobCount++;
                    return null;
                  }),
              );
            }
          } catch (jobError) {
            this.logger.error(
              `Failed to create job for recipient ${recipient.id}: ${jobError.message}`,
            );
            failedJobCount++;
          }
        }
      } else {
        // Redis yoksa direkt olarak gönder (synchronous)
        let successCount = 0;
        let failedCount = 0;

        for (const recipient of recipients) {
          try {
            if (
              notification.type === NotificationType.EMAIL &&
              recipient.email &&
              notificationEmailEnabled
            ) {
              await this.emailService.sendEmail({
                to: recipient.email,
                subject: notification.title,
                html: notification.message,
              });
              successCount++;
              this.logger.log(
                `Email sent directly to ${recipient.email} (notification ${id})`,
              );
            } else if (
              notification.type === NotificationType.SMS &&
              recipient.phone &&
              notificationSmsEnabled
            ) {
              await this.smsService.sendSms({
                to: recipient.phone,
                message: `${notification.title}\n\n${notification.message}`,
              });
              successCount++;
              this.logger.log(
                `SMS sent directly to ${recipient.phone} (notification ${id})`,
              );
            } else if (
              notification.type === NotificationType.IN_APP &&
              notificationInAppEnabled
            ) {
              // Web içi bildirim için UserNotification kaydı oluştur
              await this.prisma.userNotification.upsert({
                where: {
                  userId_notificationId: {
                    userId: recipient.id,
                    notificationId: id,
                  },
                },
                create: {
                  userId: recipient.id,
                  notificationId: id,
                  isRead: false,
                },
                update: {
                  isRead: false,
                },
              });
              successCount++;
              this.logger.log(
                `In-app notification created directly for user ${recipient.id} (notification ${id})`,
              );
            } else {
              this.logger.warn(
                `Skipping recipient ${recipient.id}: missing email/phone for notification type ${notification.type}`,
              );
              failedCount++;
            }
          } catch (error: any) {
            this.logger.error(
              `Failed to send notification directly to recipient ${recipient.id}: ${error.message}`,
              error.stack,
            );
            failedCount++;
          }
        }

        // Durumu güncelle
        const updated = await this.prisma.notification.update({
          where: { id },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            recipientCount: recipients.length,
            successCount,
            failedCount,
          },
          include: {
            sentByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        this.logger.log(
          `Notification ${id} sent directly (no queue): ${successCount} successful, ${failedCount} failed out of ${recipients.length} total`,
        );

        return updated;
      }

      // Queue kullanıldıysa buraya gelir - Job'ları ekle ve sonuçları bekle
      const jobResults = await Promise.allSettled(jobs);
      const successCount = jobResults.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failedCount =
        failedJobCount +
        jobResults.filter((r) => r.status === 'rejected').length;

      // Durumu güncelle
      const updated = await this.prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          recipientCount: recipients.length,
          successCount,
          failedCount,
        },
        include: {
          sentByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Notification ${id} sent: ${successCount} successful, ${failedCount} failed out of ${recipients.length} total`,
      );

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${id}: ${error.message}`,
        error.stack,
      );

      // Hata durumunda status'u FAILED yap
      await this.prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.FAILED,
        },
      });

      throw error;
    }
  }

  private async getRecipients(notification: {
    id: string;
    targetType: NotificationTargetType;
    targetId?: string | null;
    type: NotificationType;
    metadata?: any;
  }): Promise<Array<{ id: string; email?: string; phone?: string }>> {
    switch (notification.targetType) {
      case NotificationTargetType.ALL_MEMBERS:
        // Tüm aktif üyeler
        const allMembers = await this.prisma.member.findMany({
          where: {
            status: MemberStatus.ACTIVE,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
            phone: true,
          },
        });

        // Üye ID'lerini User ID'lere dönüştür (eğer IN_APP ise)
        if (notification.type === NotificationType.IN_APP) {
          // Üyeler için User kaydı yok, bu yüzden sadece email/phone olanları döndürüyoruz
          // IN_APP için üye bazlı bildirim sistemi kurulmalı (MemberNotification modeli gerekebilir)
          // Şimdilik sadece User'lar için IN_APP bildirimi gönderiyoruz
          return [];
        }

        return allMembers.map((m) => ({
          id: m.id,
          email: m.email || undefined,
          phone: m.phone || undefined,
        }));

      case NotificationTargetType.REGION:
        if (!notification.targetId) {
          throw new Error('targetId is required for REGION target type');
        }

        // Belirli bir ildeki aktif üyeler
        const regionMembers = await this.prisma.member.findMany({
          where: {
            provinceId: notification.targetId,
            status: MemberStatus.ACTIVE,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
            phone: true,
          },
        });

        return regionMembers.map((m) => ({
          id: m.id,
          email: m.email || undefined,
          phone: m.phone || undefined,
        }));

      case NotificationTargetType.SCOPE:
        // Scope bazlı bildirim (UserScope'a göre)
        // Metadata'dan scope bilgisi al (NOTIFY_OWN_SCOPE için)
        const metadata = notification.metadata;
        const scopeProvinceId = metadata?.scopeProvinceId;
        const scopeDistrictId = metadata?.scopeDistrictId;

        // Scope koşullarını oluştur
        const scopeConditions: any[] = [];

        if (scopeDistrictId) {
          // İlçe bazlı scope - sadece o ilçedeki üyeler
          scopeConditions.push({ districtId: scopeDistrictId });
        } else if (scopeProvinceId) {
          // İl bazlı scope - o ildeki tüm üyeler
          scopeConditions.push({ provinceId: scopeProvinceId });
        } else if (notification.targetId) {
          // Eski yöntem: targetId ile (geriye dönük uyumluluk)
          scopeConditions.push(
            { provinceId: notification.targetId },
            { districtId: notification.targetId },
          );
        } else {
          throw new Error(
            'SCOPE target type için targetId veya scope bilgisi (metadata) gerekli',
          );
        }

        // Scope'a göre üyeleri filtrele (çoklu scope desteği)
        const scopeMembers = await this.prisma.member.findMany({
          where: {
            OR: scopeConditions,
            status: MemberStatus.ACTIVE,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
            phone: true,
          },
        });

        return scopeMembers.map((m) => ({
          id: m.id,
          email: m.email || undefined,
          phone: m.phone || undefined,
        }));

      case NotificationTargetType.USER:
        // Metadata içinde userIds array'i varsa, birden fazla kullanıcıya gönder
        if (
          notification.metadata &&
          typeof notification.metadata === 'object' &&
          Array.isArray(notification.metadata.userIds) &&
          notification.metadata.userIds.length > 0
        ) {
          // Birden fazla kullanıcıya bildirim gönder
          const userIds = notification.metadata.userIds;
          const users = await this.prisma.user.findMany({
            where: {
              id: { in: userIds },
              isActive: true,
              deletedAt: null,
            },
            select: {
              id: true,
              email: true,
            },
          });

          if (users.length === 0) {
            throw new Error('Seçilen kullanıcılardan hiçbiri bulunamadı');
          }

          return users.map((u) => ({
            id: u.id,
            email: u.email,
          }));
        }

        // Tek kullanıcıya bildirim (geriye dönük uyumluluk)
        if (!notification.targetId) {
          throw new Error('targetId is required for USER target type');
        }

        // Belirli bir kullanıcıya bildirim (onay bekleyen işlemler için)
        const user = await this.prisma.user.findUnique({
          where: { id: notification.targetId },
          select: {
            id: true,
            email: true,
          },
        });

        if (!user) {
          throw new Error(`User ${notification.targetId} not found`);
        }

        return [
          {
            id: user.id,
            email: user.email,
          },
        ];

      default:
        throw new Error(`Unsupported target type: ${notification.targetType}`);
    }
  }

  async findUserNotifications(params: {
    userId: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { userId, isRead, limit = 25, offset = 0 } = params;

    const where: any = {
      userId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [userNotifications, total] = await Promise.all([
      this.prisma.userNotification.findMany({
        where,
        include: {
          notification: {
            include: {
              sentByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.userNotification.count({ where }),
    ]);

    return {
      data: userNotifications.map((un) => ({
        id: un.id,
        notificationId: un.notificationId,
        isRead: un.isRead,
        readAt: un.readAt,
        createdAt: un.createdAt,
        notification: un.notification,
      })),
      total,
      limit,
      offset,
    };
  }

  async findUnreadCount(userId: string): Promise<number> {
    return this.prisma.userNotification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(userId: string, id: string) {
    // Önce userNotificationId olarak dene
    let userNotification = await this.prisma.userNotification.findFirst({
      where: {
        id: id,
        userId,
      },
    });

    // Bulunamazsa notificationId olarak dene
    if (!userNotification) {
      userNotification = await this.prisma.userNotification.findFirst({
        where: {
          notificationId: id,
          userId,
        },
      });
    }

    if (!userNotification) {
      throw new NotFoundException('Bildirim bulunamadı');
    }

    // Zaten okundu ise güncelleme yapma ama include ile döndür
    if (userNotification.isRead) {
      return this.prisma.userNotification.findUnique({
        where: { id: userNotification.id },
        include: {
          notification: {
            include: {
              sentByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    }

    return this.prisma.userNotification.update({
      where: { id: userNotification.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        notification: {
          include: {
            sentByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.userNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      count: result.count,
      message: `${result.count} bildirim okundu olarak işaretlendi`,
    };
  }

  async delete(id: string) {
    await this.notificationApplicationService.deleteNotification({
      notificationId: id,
    });
    return await this.prisma.notification.findUnique({ where: { id } });
  }
}
