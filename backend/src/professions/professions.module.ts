import { Module } from '@nestjs/common';
import { ProfessionsService } from './professions.service';
import { ProfessionsController } from './presentation/controllers/professions.controller';
import { ProfessionApplicationService } from './application/services/profession-application.service';
import { ProfessionManagementDomainService } from './domain/services/profession-management-domain.service';
import { PrismaProfessionRepository } from './infrastructure/persistence/prisma-profession.repository';
import { ProfessionRepository } from './domain/repositories/profession.repository.interface';
import { ProfessionExceptionFilter } from './presentation/filters/profession-exception.filter';
import { ProfessionValidationPipe } from './presentation/pipes/profession-validation.pipe';

@Module({
  providers: [
    ProfessionsService,
    ProfessionApplicationService,
    ProfessionManagementDomainService,
    {
      provide: 'ProfessionRepository',
      useClass: PrismaProfessionRepository,
    },
    PrismaProfessionRepository,
    ProfessionExceptionFilter,
    ProfessionValidationPipe,
  ],
  controllers: [ProfessionsController],
  exports: [ProfessionsService],
})
export class ProfessionsModule {}
