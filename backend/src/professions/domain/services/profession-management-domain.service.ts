/**
 * Profession Management Domain Service
 */
import { Injectable, Inject } from '@nestjs/common';
import type { ProfessionRepository } from '../repositories/profession.repository.interface';
import { ProfessionNameAlreadyExistsException } from '../exceptions/profession-domain.exception';

@Injectable()
export class ProfessionManagementDomainService {
  constructor(
    @Inject('ProfessionRepository')
    private readonly professionRepository: ProfessionRepository,
  ) {}

  async validateNameUniqueness(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.professionRepository.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new ProfessionNameAlreadyExistsException(name);
    }
  }
}
