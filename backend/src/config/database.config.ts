import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  }
}
