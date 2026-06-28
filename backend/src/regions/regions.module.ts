import { Module } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { RegionsController } from './presentation/controllers/regions.controller';
import { ProvinceApplicationService } from './application/services/province-application.service';
import { DistrictApplicationService } from './application/services/district-application.service';
import { PrismaProvinceRepository } from './infrastructure/persistence/prisma-province.repository';
import { PrismaDistrictRepository } from './infrastructure/persistence/prisma-district.repository';
import {
  ProvinceRepository,
  DistrictRepository,
} from './domain/repositories/region.repository.interface';
import { RegionExceptionFilter } from './presentation/filters/region-exception.filter';
import { RegionValidationPipe } from './presentation/pipes/region-validation.pipe';

@Module({
  providers: [
    RegionsService,
    ProvinceApplicationService,
    DistrictApplicationService,
    {
      provide: 'ProvinceRepository',
      useClass: PrismaProvinceRepository,
    },
    {
      provide: 'DistrictRepository',
      useClass: PrismaDistrictRepository,
    },
    PrismaProvinceRepository,
    PrismaDistrictRepository,
    RegionExceptionFilter,
    RegionValidationPipe,
  ],
  controllers: [RegionsController],
})
export class RegionsModule {}
