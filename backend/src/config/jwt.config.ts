import { Injectable } from '@nestjs/common';
import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from './config.service';

@Injectable()
export class JwtConfigService {
  constructor(private configService: ConfigService) {}

  createJwtOptions(): JwtModuleOptions {
    const expiresIn = this.configService.jwtExpiresIn;
    return {
      secret: this.configService.jwtSecret,
      signOptions: {
        expiresIn: expiresIn as any, // JWT accepts string values like "24h", "7d" etc.
      },
    };
  }
}
