/**
 * User Registration Domain Service
 *
 * Encapsulates complex business logic for user registration.
 */
import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../repositories/user.repository.interface';
import { Email } from '../value-objects/email.vo';
import {
  UserEmailAlreadyExistsException,
  UserMemberAlreadyLinkedException,
  UserMemberRequiredException,
  UserScopeRequiredException,
  UserInvalidScopeException,
} from '../exceptions/user-domain.exception';

export interface RoleInfo {
  id: string;
  name: string;
  hasScopeRestriction: boolean;
}

export interface MemberInfo {
  id: string;
  userId: string | null;
}

@Injectable()
export class UserRegistrationDomainService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async validateEmailUniqueness(email: Email): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new UserEmailAlreadyExistsException(email.value);
    }
  }

  async validateMemberLink(
    memberId: string,
    memberInfo: MemberInfo | null,
  ): Promise<void> {
    if (!memberInfo) {
      throw new Error('Member not found');
    }
    if (memberInfo.userId) {
      throw new UserMemberAlreadyLinkedException(memberId);
    }
  }

  validateMemberRequirement(hasAdminRole: boolean, memberId?: string): void {
    if (!hasAdminRole && !memberId) {
      throw new UserMemberRequiredException();
    }
  }

  validateScopeRequirement(
    roles: RoleInfo[],
    scopes?: Array<{ provinceId?: string; districtId?: string }>,
  ): void {
    const hasScopeRestrictedRole = roles.some(
      (role) => role.hasScopeRestriction,
    );
    if (hasScopeRestrictedRole) {
      if (!scopes || scopes.length === 0) {
        const restrictedRoleNames = roles
          .filter((r) => r.hasScopeRestriction)
          .map((r) => r.name)
          .join(', ');
        throw new UserScopeRequiredException(restrictedRoleNames);
      }

      for (const scope of scopes) {
        if (!scope.provinceId && !scope.districtId) {
          throw new UserInvalidScopeException(
            'Her yetki alanı için en az bir il veya ilçe seçmelisiniz.',
          );
        }

        if (scope.districtId && !scope.provinceId) {
          throw new UserInvalidScopeException(
            'İlçe seçmek için önce il seçmelisiniz.',
          );
        }
      }
    }
  }

  async validateDistrictProvinceRelation(
    districtId: string,
    provinceId: string,
    validateFn: (districtId: string, provinceId: string) => Promise<boolean>,
  ): Promise<void> {
    const isValid = await validateFn(districtId, provinceId);
    if (!isValid) {
      throw new UserInvalidScopeException(
        'Seçilen ilçe, seçilen ile ait değil.',
      );
    }
  }
}
