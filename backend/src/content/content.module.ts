import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './presentation/controllers/content.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentApplicationService } from './application/services/content-application.service';
import { PrismaContentRepository } from './infrastructure/persistence/prisma-content.repository';
import { ContentRepository } from './domain/repositories/content.repository.interface';
import { ContentExceptionFilter } from './presentation/filters/content-exception.filter';
import { ContentValidationPipe } from './presentation/pipes/content-validation.pipe';

@Module({
  imports: [PrismaModule],
  providers: [
    ContentService,
    ContentApplicationService,
    {
      provide: 'ContentRepository',
      useClass: PrismaContentRepository,
    },
    PrismaContentRepository,
    ContentExceptionFilter,
    ContentValidationPipe,
  ],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
