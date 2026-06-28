import { Module } from '@nestjs/common';
import { MemberImportController } from './presentation/controllers/member-import.controller';
import { MemberImportValidationService } from './application/services/member-import-validation.service';

@Module({
  controllers: [MemberImportController],
  providers: [MemberImportValidationService],
  exports: [MemberImportValidationService],
})
export class ImportsModule {}
