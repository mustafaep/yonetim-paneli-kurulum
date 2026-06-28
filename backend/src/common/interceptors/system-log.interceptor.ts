import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SystemService } from '../../system/system.service';
import { Reflector } from '@nestjs/core';
import { Public } from '../../auth/decorators/public.decorator';

@Injectable()
export class SystemLogInterceptor implements NestInterceptor {
  constructor(
    @Inject(forwardRef(() => SystemService))
    private systemService: SystemService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query, user } = request;

    // Public endpoint'leri loglama
    const isPublic = this.reflector.getAllAndOverride<boolean>(Public, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic && method === 'POST' && url.includes('/auth/login')) {
      // Login işlemini özel olarak logla (kullanıcı henüz authenticate olmamış)
      const ipAddress = this.getIpAddress(request);
      const userAgent = request.headers['user-agent'] || 'unknown';

      return next.handle().pipe(
        tap({
          next: async (response) => {
            if (response?.user?.id) {
              try {
                // SystemService'in mevcut olduğundan emin ol
                if (!this.systemService) {
                  console.warn('SystemService is not available for logging');
                  return;
                }
                // Başarılı login
                await this.systemService.createLog({
                  action: 'LOGIN',
                  entityType: 'AUTH',
                  userId: response.user.id,
                  details: {
                    email: body?.email,
                    success: true,
                  },
                  ipAddress,
                  userAgent,
                });
              } catch (error) {
                // Log kaydı başarısız olsa bile işlemi durdurma
                console.error('System log kaydı oluşturulamadı:', error);
              }
            }
          },
          error: async (error) => {
            try {
              // SystemService'in mevcut olduğundan emin ol
              if (!this.systemService) {
                console.warn('SystemService is not available for logging');
                return;
              }
              // Başarısız login - userId null olabilir
              await this.systemService.createLog({
                action: 'LOGIN_FAILED',
                entityType: 'AUTH',
                userId: undefined, // Başarısız login için null
                details: {
                  email: body?.email,
                  success: false,
                  error: error.message || 'Kimlik doğrulama bilgileri hatalı',
                },
                ipAddress,
                userAgent,
              });
            } catch (logError) {
              console.error('System log kaydı oluşturulamadı:', logError);
            }
          },
        }),
      );
    }

    // Authenticated kullanıcı yoksa loglama
    if (!user?.userId) {
      return next.handle();
    }

    // HTTP metoduna göre action belirle
    let action: string;
    switch (method) {
      case 'POST':
        action = 'CREATE';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'UPDATE';
        break;
      case 'DELETE':
        action = 'DELETE';
        break;
      case 'GET':
        // GET isteklerini sadece önemli endpoint'lerde logla
        if (this.shouldLogGetRequest(url)) {
          action = 'VIEW';
        } else {
          return next.handle();
        }
        break;
      default:
        return next.handle();
    }

    // URL'den entity type çıkar
    const entityType = this.extractEntityType(url);
    if (!entityType) {
      return next.handle();
    }

    // Çıkış (logout) için özel action – denetim için kim, ne zaman çıkış yaptı
    if (entityType === 'AUTH' && url.includes('/auth/logout')) {
      action = 'LOGOUT';
    }

    // Entity ID'yi params veya body'den al
    const entityId = params?.id || body?.id || query?.id || null;

    // Request detaylarını hazırla
    const details: any = {
      url,
      method,
    };

    // Body'den hassas bilgileri çıkar (şifre, token vb.)
    if (body) {
      const sanitizedBody = { ...body };
      delete sanitizedBody.password;
      delete sanitizedBody.passwordHash;
      delete sanitizedBody.token;
      delete sanitizedBody.accessToken;
      delete sanitizedBody.refreshToken;
      details.body = sanitizedBody;
    }

    if (Object.keys(params).length > 0) {
      details.params = params;
    }

    if (Object.keys(query).length > 0) {
      details.query = query;
    }

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // SystemService'in mevcut olduğundan emin ol
            if (!this.systemService) {
              console.warn('SystemService is not available for logging');
              return;
            }
            // Başarılı işlemleri logla
            await this.systemService.createLog({
              action,
              entityType,
              entityId:
                entityId || (response?.id ? String(response.id) : undefined),
              userId: user.userId,
              details: {
                ...details,
                responseStatus: 'success',
                responseId: response?.id,
              },
              ipAddress: this.getIpAddress(request),
              userAgent: request.headers['user-agent'] || 'unknown',
            });
          } catch (error) {
            // Log kaydı başarısız olsa bile işlemi durdurma
            console.error('System log kaydı oluşturulamadı:', error);
          }
        },
        error: async (error) => {
          try {
            // SystemService'in mevcut olduğundan emin ol
            if (!this.systemService) {
              console.warn('SystemService is not available for logging');
              return;
            }
            // Hatalı işlemleri de logla
            await this.systemService.createLog({
              action,
              entityType,
              entityId: entityId || undefined,
              userId: user.userId,
              details: {
                ...details,
                responseStatus: 'error',
                error: error.message || 'Bilinmeyen hata',
                errorStatus: error.status || 500,
              },
              ipAddress: this.getIpAddress(request),
              userAgent: request.headers['user-agent'] || 'unknown',
            });
          } catch (logError) {
            console.error('System log kaydı oluşturulamadı:', logError);
          }
        },
      }),
    );
  }

  private extractEntityType(url: string): string | null {
    // URL'den entity type çıkar (kapsam: SISTEM_LOGLARI_KAPSAM_TAKIP.md)
    const patterns = [
      { pattern: /\/users(\/|$)/, type: 'USER' },
      { pattern: /\/members(\/|$)/, type: 'MEMBER' },
      { pattern: /\/roles(\/|$)/, type: 'ROLE' },
      { pattern: /\/regions(\/|$)/, type: 'REGION' },
      { pattern: /\/provinces(\/|$)/, type: 'PROVINCE' },
      { pattern: /\/districts(\/|$)/, type: 'DISTRICT' },
      { pattern: /\/branches(\/|$)/, type: 'BRANCH' },
      { pattern: /\/content(\/|$)/, type: 'CONTENT' },
      { pattern: /\/notifications(\/|$)/, type: 'NOTIFICATION' },
      { pattern: /\/payments(\/|$)/, type: 'PAYMENT' },
      { pattern: /\/documents(\/|$)/, type: 'DOCUMENT' },
      { pattern: /\/institutions(\/|$)/, type: 'INSTITUTION' },
      { pattern: /\/approvals(\/|$)/, type: 'APPROVAL' },
      { pattern: /\/accounting(\/|$)/, type: 'ACCOUNTING' },
      { pattern: /\/system\/settings(\/|$)/, type: 'SYSTEM_SETTING' },
      // Kapsam genişletmesi – SISTEM_LOGLARI_KAPSAM_TAKIP.md
      { pattern: /\/auth(\/|$)/, type: 'AUTH' },
      { pattern: /\/panel-user-applications(\/|$)/, type: 'PANEL_APPLICATION' },
      { pattern: /\/professions(\/|$)/, type: 'PROFESSION' },
      { pattern: /\/member-groups(\/|$)/, type: 'MEMBER_GROUP' },
      { pattern: /\/imports(\/|$)/, type: 'IMPORT' },
      { pattern: /\/reports(\/|$)/, type: 'REPORT' },
      { pattern: /\/system\/logs(\/|$)/, type: 'SYSTEM_LOG' },
      { pattern: /\/system\/upload-/, type: 'SYSTEM_SETTING' },
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(url)) {
        return type;
      }
    }

    return null;
  }

  private shouldLogGetRequest(url: string): boolean {
    // Sadece önemli GET isteklerini logla (detay sayfaları, export işlemleri vb.) – SISTEM_LOGLARI_KAPSAM_TAKIP.md
    const importantPatterns = [
      /\/export/,
      /\/download/,
      /\/generate/,
      /\/reports/,
      /\/system\/logs/,
      /\/view\//, // belge/döküman görüntüleme
    ];

    return importantPatterns.some((pattern) => pattern.test(url));
  }

  private getIpAddress(request: any): string {
    // IP adresini çeşitli kaynaklardan al
    return (
      request.ip ||
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
