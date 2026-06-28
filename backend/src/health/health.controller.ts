import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Sistem sağlık durumu', description: 'Veritabanı ve Redis bağlantı durumunu döner' })
  async check() {
    const checks: Record<string, 'ok' | 'error'> = {};
    let overall: 'ok' | 'degraded' | 'error' = 'ok';

    // PostgreSQL kontrolü
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      overall = 'error';
    }

    // Redis kontrolü
    try {
      if (this.redis.isConnected) {
        checks.redis = 'ok';
      } else {
        checks.redis = 'error';
        if (overall === 'ok') overall = 'degraded';
      }
    } catch {
      checks.redis = 'error';
      if (overall === 'ok') overall = 'degraded';
    }

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks,
    };
  }
}
