import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '../../config/config.service';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

@Injectable()
export class NotificationQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueue.name);
  private queue: Queue | null = null;
  private isRedisAvailable = false;
  private readonly redisEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.redisEnabled = this.configService.redisEnabled;

    if (this.redisEnabled) {
      this.queue = new Queue(NOTIFICATION_QUEUE_NAME, {
        connection: {
          host: this.configService.redisHost,
          port: this.configService.redisPort,
          password: this.configService.redisPassword,
          maxRetriesPerRequest: null,
          retryStrategy: (times) => Math.min(times * 50, 5000),
          enableOfflineQueue: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      });
    }
  }

  async onModuleInit() {
    if (!this.redisEnabled || !this.queue) {
      this.isRedisAvailable = false;
      this.logger.warn(
        'Notification queue devre disi (REDIS_ENABLED=false). Bildirimler dogrudan gonderilecek.',
      );
      return;
    }

    this.logger.log(
      `Notification queue initialized for Redis at ${this.configService.redisHost}:${this.configService.redisPort}`,
    );

    try {
      await this.queue.waitUntilReady();
      this.isRedisAvailable = true;
      this.logger.log('Redis connection verified for notification queue.');
    } catch (error: any) {
      this.isRedisAvailable = false;
      this.logger.warn(
        `Redis not available for notification queue: ${error?.message || 'unknown error'}`,
      );
    }
  }

  /**
   * Redis'in kullanılabilir olup olmadığını kontrol et
   */
  get redisAvailable(): boolean {
    return this.isRedisAvailable;
  }

  /**
   * Job ekleme işlemini Redis durumuna göre yap
   */
  async addSafe(jobName: string, data: any, options?: any) {
    if (!this.redisEnabled || !this.queue) {
      throw new Error('Redis is disabled. Cannot add job to queue.');
    }
    try {
      const job = await this.add(jobName, data, options);
      // Başarılı olduysa Redis çalışıyor demektir
      if (!this.isRedisAvailable) {
        this.isRedisAvailable = true;
        this.logger.log(
          `Redis connection verified through successful job addition`,
        );
      }
      return job;
    } catch (error) {
      this.isRedisAvailable = false;
      if (
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('Redis')
      ) {
        this.logger.warn(
          `Cannot add job '${jobName}': Redis is not available. Job data: ${JSON.stringify(data)}`,
        );
        throw new Error('Redis is not available. Cannot add job to queue.');
      }
      throw error;
    }
  }

  /**
   * Override add method to track Redis availability
   */
  async add(name: string, data: any, opts?: any) {
    if (!this.redisEnabled || !this.queue) {
      throw new Error('Redis is disabled. Cannot add job to queue.');
    }

    try {
      const job = await this.queue.add(name, data, opts);
      // Başarılı olduysa Redis çalışıyor demektir
      if (!this.isRedisAvailable) {
        this.isRedisAvailable = true;
        this.logger.log(
          `Redis connection verified through successful job addition`,
        );
      }
      return job;
    } catch (error) {
      this.isRedisAvailable = false;
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
