import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './presentation/controllers/users.controller';
import { UserCreationApplicationService } from './application/services/user-creation-application.service';
import { UserQueryApplicationService } from './application/services/user-query-application.service';
import { UserUpdateRolesApplicationService } from './application/services/user-update-roles-application.service';
import { UserDemotionApplicationService } from './application/services/user-demotion-application.service';
import { UserRegistrationDomainService } from './domain/services/user-registration-domain.service';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { UserRepository } from './domain/repositories/user.repository.interface';
import { UserExceptionFilter } from './presentation/filters/user-exception.filter';
import { UserValidationPipe } from './presentation/pipes/user-validation.pipe';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [
    UsersService,
    UserCreationApplicationService,
    UserQueryApplicationService,
    UserUpdateRolesApplicationService,
    UserDemotionApplicationService,
    UserRegistrationDomainService,
    {
      provide: 'UserRepository',
      useClass: PrismaUserRepository,
    },
    PrismaUserRepository,
    UserExceptionFilter,
    UserValidationPipe,
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
