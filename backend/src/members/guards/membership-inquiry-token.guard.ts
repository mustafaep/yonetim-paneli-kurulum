import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { ConfigService } from '../../config/config.service';

function hashToken(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

@Injectable()
export class MembershipInquiryTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.membershipInquiryToken;
    if (!expected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerRaw = request.headers['x-membership-inquiry-token'];
    const headerValue =
      typeof headerRaw === 'string'
        ? headerRaw.trim()
        : Array.isArray(headerRaw)
          ? headerRaw[0]?.trim() ?? ''
          : '';
    const queryValue =
      typeof request.query?.token === 'string'
        ? request.query.token.trim()
        : '';

    const presented = headerValue || queryValue;
    if (!presented) {
      throw new UnauthorizedException({
        message:
          'Üyelik sorgulama için geçerli anahtar gerekli. X-Membership-Inquiry-Token başlığı veya token sorgu parametresi ekleyin.',
      });
    }

    const expectedHash = hashToken(expected);
    const presentedHash = hashToken(presented);
    if (
      expectedHash.length !== presentedHash.length ||
      !timingSafeEqual(expectedHash, presentedHash)
    ) {
      throw new UnauthorizedException({
        message: 'Geçersiz üyelik sorgulama anahtarı.',
      });
    }

    return true;
  }
}
