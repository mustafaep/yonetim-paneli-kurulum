/**
 * Profession Application Service
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Profession } from '../../domain/entities/profession.entity';
import type { ProfessionRepository } from '../../domain/repositories/profession.repository.interface';
import { ProfessionManagementDomainService } from '../../domain/services/profession-management-domain.service';
import { CreateProfessionDto } from '../dto/create-profession.dto';
import { UpdateProfessionDto } from '../dto/update-profession.dto';
import {
  ProfessionNotFoundException,
  ProfessionInUseException,
} from '../../domain/exceptions/profession-domain.exception';

export interface CreateProfessionCommand {
  dto: CreateProfessionDto;
}

export interface UpdateProfessionCommand {
  professionId: string;
  dto: UpdateProfessionDto;
}

export interface DeleteProfessionCommand {
  professionId: string;
}

@Injectable()
export class ProfessionApplicationService {
  private readonly logger = new Logger(ProfessionApplicationService.name);

  constructor(
    @Inject('ProfessionRepository')
    private readonly professionRepository: ProfessionRepository,
    private readonly professionManagementDomainService: ProfessionManagementDomainService,
  ) {}

  async createProfession(
    command: CreateProfessionCommand,
  ): Promise<Profession> {
    const { dto } = command;
    await this.professionManagementDomainService.validateNameUniqueness(
      dto.name,
    );
    const profession = Profession.create({ name: dto.name }, '');
    const created = await this.professionRepository.create(profession);
    this.logger.log(`Profession created: ${created.id} (${created.name})`);
    return created;
  }

  async updateProfession(
    command: UpdateProfessionCommand,
  ): Promise<Profession> {
    const { professionId, dto } = command;
    const profession = await this.professionRepository.findById(professionId);
    if (!profession) {
      throw new ProfessionNotFoundException(professionId);
    }
    if (dto.name && dto.name !== profession.name) {
      await this.professionManagementDomainService.validateNameUniqueness(
        dto.name,
        professionId,
      );
    }
    profession.update(dto);
    await this.professionRepository.save(profession);
    this.logger.log(
      `Profession updated: ${profession.id} (${profession.name})`,
    );
    return profession;
  }

  async findAll(includeInactive: boolean = false): Promise<Profession[]> {
    return await this.professionRepository.findAll(includeInactive);
  }

  async findById(id: string): Promise<Profession> {
    const profession = await this.professionRepository.findById(id);
    if (!profession) {
      throw new ProfessionNotFoundException(id);
    }
    return profession;
  }

  async deleteProfession(command: DeleteProfessionCommand): Promise<void> {
    const { professionId } = command;
    const profession = await this.professionRepository.findById(professionId);
    if (!profession) {
      throw new ProfessionNotFoundException(professionId);
    }
    const memberCount =
      await this.professionRepository.countMembersByProfessionId(professionId);
    if (memberCount > 0) {
      profession.deactivate();
      await this.professionRepository.save(profession);
    } else {
      await this.professionRepository.delete(professionId);
    }
    this.logger.log(
      `Profession deleted/deactivated: ${profession.id} (${profession.name})`,
    );
  }
}
