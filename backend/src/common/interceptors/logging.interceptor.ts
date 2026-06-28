import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query } = request;
    const now = Date.now();

    const logLevel = this.configService.getSystemSetting(
      'MAINTENANCE_LOG_LEVEL',
      'warn',
    );
    const debugMode = this.configService.getSystemSettingBoolean(
      'MAINTENANCE_DEBUG_MODE',
      false,
    );

    if (debugMode) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(
        `→ ${method} ${url} | query: ${JSON.stringify(query)} | body: ${JSON.stringify(sanitizedBody)}`,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          const statusCode: number = response.statusCode;

          if (logLevel === 'error') return;

          if (logLevel === 'warn' && statusCode < 400) return;

          this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms`);
        },
        error: (error: { message?: string; status?: number }) => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${url} - ${error.message ?? 'Unknown error'} - ${delay}ms`,
          );
        },
      }),
    );
  }

  /** Şifre/token gibi hassas alanları loglara yazmamak için temizler. */
  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'refreshToken'];
    return Object.fromEntries(
      Object.entries(body).map(([key, value]) => [
        key,
        sensitiveKeys.some((s) => key.toLowerCase().includes(s)) ? '***' : value,
      ]),
    );
  }
}
