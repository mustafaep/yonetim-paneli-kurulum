/**
 * Member Group Management Domain Service
 */
import { Injectable, Inject } from '@nestjs/common';
import type { MemberGroupRepository } from '../repositories/member-group.repository.interface';
import { MemberGroupNameAlreadyExistsException } from '../exceptions/member-group-domain.exception';

@Injectable()
export class MemberGroupManagementDomainService {
  constructor(
    @Inject('MemberGroupRepository')
    private readonly memberGroupRepository: MemberGroupRepository,
  ) {}

  async validateNameUniqueness(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.memberGroupRepository.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new MemberGroupNameAlreadyExistsException(name);
    }
  }
}
