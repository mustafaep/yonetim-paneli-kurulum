import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Soft delete middleware'i Prisma Extension olarak uygular.
 * Prisma 6.x'te $use() kaldırıldı; bunun yerine $extends() kullanılır.
 */
function withSoftDelete(prisma: PrismaClient) {
  const softDeleteModels: Prisma.ModelName[] = [
    'User',
    'Member',
    'CustomRole',
    'MemberPayment',
    'MemberDocument',
  ];

  // modelsWithIsActive: soft delete'te isActive = false de yapılacak modeller
  const modelsWithIsActive: Prisma.ModelName[] = [
    'User',
    'Member',
    'CustomRole',
  ];

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (model && softDeleteModels.includes(model as Prisma.ModelName)) {
            args.where = args.where || {};
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }
          return query(args);
        },

        async findFirst({ model, args, query }) {
          if (model && softDeleteModels.includes(model as Prisma.ModelName)) {
            args.where = args.where || {};
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }
          return query(args);
        },

        async findUnique({ model, args, query }) {
          if (model && softDeleteModels.includes(model as Prisma.ModelName)) {
            args.where = args.where || {};
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }
          return query(args);
        },

        async delete({ model, args, query }) {
          if (model && softDeleteModels.includes(model as Prisma.ModelName)) {
            // delete → soft delete (update ile deletedAt set et)
            const data: any = { deletedAt: new Date() };
            if (modelsWithIsActive.includes(model as Prisma.ModelName)) {
              data.isActive = false;
            }
            return (prisma as any)[model].update({
              where: args.where,
              data,
            });
          }
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (model && softDeleteModels.includes(model as Prisma.ModelName)) {
            const data: any = { deletedAt: new Date() };
            if (modelsWithIsActive.includes(model as Prisma.ModelName)) {
              data.isActive = false;
            }
            return (prisma as any)[model].updateMany({
              where: args.where,
              data,
            });
          }
          return query(args);
        },
      },
    },
  });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private extendedClient: ReturnType<typeof withSoftDelete> | null = null;

  constructor() {
    super({
      // Bağlantı havuzu ayarları datasource URL'den okunur,
      // ancak log seviyesi burada yapılandırılır
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    // Hata ve uyarı logları
    (this as any).$on('error', (e: any) => {
      this.logger.error(`Prisma Error: ${e.message}`, e.target);
    });
    (this as any).$on('warn', (e: any) => {
      this.logger.warn(`Prisma Warning: ${e.message}`);
    });

    // Veritabanına bağlan (retry ile)
    await this.connectWithRetry();

    // Soft delete extension'ı uygula
    this.extendedClient = withSoftDelete(this);
    this.logger.log('Prisma soft-delete extension aktif');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma bağlantısı kapatıldı');
  }

  /**
   * Veritabanına retry mekanizmalı bağlantı.
   * Docker ortamında postgres container'ı henüz hazır olmayabilir.
   */
  private async connectWithRetry(
    maxRetries = 5,
    delayMs = 3000,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log(
          `Veritabanı bağlantısı başarılı (deneme ${attempt}/${maxRetries})`,
        );
        return;
      } catch (error) {
        this.logger.warn(
          `Veritabanı bağlantı denemesi ${attempt}/${maxRetries} başarısız: ${(error as Error).message}`,
        );

        if (attempt === maxRetries) {
          this.logger.error(
            `Veritabanına ${maxRetries} denemede bağlanılamadı! Uygulama başlatılamıyor.`,
          );
          throw error;
        }

        // Exponential backoff: 3s, 6s, 12s, 24s, 48s
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        this.logger.log(`${waitTime}ms sonra tekrar denenecek...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Soft-delete extension uygulanmış client'ı döner.
   * Repository'lerde doğrudan this.prisma yerine this.prisma.extended kullanılabilir.
   */
  get extended() {
    return this.extendedClient || this;
  }
}
