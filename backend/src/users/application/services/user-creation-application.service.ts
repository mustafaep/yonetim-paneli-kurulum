/**
 * User Creation Application Service
 *
 * Orchestrates user creation use case.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordService } from '../../../auth/infrastructure/services/password.service';
import { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository.interface';
import { Email } from '../../domain/value-objects/email.vo';
import { UserRegistrationDomainService } from '../../domain/services/user-registration-domain.service';
import { CreateUserDto } from '../dto/create-user.dto';

export interface CreateUserCommand {
  dto: CreateUserDto;
  memberId?: string;
}

@Injectable()
export class UserCreationApplicationService {
  private readonly logger = new Logger(UserCreationApplicationService.name);

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly registrationDomainService: UserRegistrationDomainService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async createUser(command: CreateUserCommand): Promise<User> {
    const { dto, memberId } = command;

    const email = Email.create(dto.email);
    await this.registrationDomainService.validateEmailUniqueness(email);

    let hasAdminRole = false;
    let roles: Array<{
      id: string;
      name: string;
      hasScopeRestriction: boolean;
    }> = [];

    if (dto.customRoleIds && dto.customRoleIds.length > 0) {
      roles = await this.prisma.customRole.findMany({
        where: {
          id: { in: dto.customRoleIds },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          hasScopeRestriction: true,
        },
      });

      hasAdminRole = roles.some((role) => role.name === 'ADMIN');

      this.registrationDomainService.validateMemberRequirement(
        hasAdminRole,
        memberId,
      );

      if (memberId) {
        const member = await this.prisma.member.findUnique({
          where: { id: memberId },
          select: { id: true, userId: true },
        });
        if (!member) {
          throw new NotFoundException('Belirtilen üye bulunamadı.');
        }
        await this.registrationDomainService.validateMemberLink(
          memberId,
          member,
        );
      }

      this.registrationDomainService.validateScopeRequirement(
        roles,
        dto.scopes,
      );

      if (dto.scopes && dto.scopes.length > 0) {
        for (const scope of dto.scopes) {
          if (scope.districtId && scope.provinceId) {
            const district = await this.prisma.district.findUnique({
              where: { id: scope.districtId },
              select: { provinceId: true },
            });
            if (district && district.provinceId !== scope.provinceId) {
              throw new BadRequestException(
                'Seçilen ilçe, seçilen ile ait değil.',
              );
            }
          }
        }
      }
    } else {
      if (!memberId) {
        throw new BadRequestException(
          'Admin kullanıcı hariç tüm panel kullanıcıları bir üyeden gelmelidir. Panel kullanıcı başvurusu onayı üzerinden oluşturulmalıdır.',
        );
      }

      if (memberId) {
        const member = await this.prisma.member.findUnique({
          where: { id: memberId },
          select: { id: true, userId: true },
        });
        if (!member) {
          throw new NotFoundException('Belirtilen üye bulunamadı.');
        }
        if (member.userId) {
          throw new BadRequestException(
            'Bu üye zaten bir panel kullanıcısına bağlı.',
          );
        }
      }
    }

    const passwordHash = await this.passwordService.hashWithPolicy(dto.password);

    const scopes =
      dto.scopes ||
      (dto.provinceId || dto.districtId
        ? [{ provinceId: dto.provinceId, districtId: dto.districtId }]
        : []);

    const user = User.create(
      {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        memberId,
        customRoleIds: dto.customRoleIds,
        scopes,
      },
      '',
    );

    const createdUser = await this.userRepository.create(user);

    if (memberId) {
      await this.prisma.member.update({
        where: { id: memberId },
        data: { userId: createdUser.id },
      });
    }

    if (scopes.length > 0) {
      await this.prisma.userScope.createMany({
        data: scopes.map((scope) => ({
          userId: createdUser.id,
          provinceId: scope.provinceId || null,
          districtId: scope.districtId || null,
        })),
      });
    }

    this.logger.log(`User created: ${createdUser.id} (${createdUser.email})`);

    return createdUser;
  }
}
