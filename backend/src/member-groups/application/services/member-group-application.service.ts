/**
 * Member Group Application Service
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { MemberGroup } from '../../domain/entities/member-group.entity';
import type { MemberGroupRepository } from '../../domain/repositories/member-group.repository.interface';
import { MemberGroupManagementDomainService } from '../../domain/services/member-group-management-domain.service';
import { CreateMemberGroupDto } from '../dto/create-member-group.dto';
import { UpdateMemberGroupDto } from '../dto/update-member-group.dto';
import {
  MemberGroupNotFoundException,
  MemberGroupAlreadyAtTopException,
  MemberGroupAlreadyAtBottomException,
} from '../../domain/exceptions/member-group-domain.exception';

export interface CreateMemberGroupCommand {
  dto: CreateMemberGroupDto;
}

export interface UpdateMemberGroupCommand {
  memberGroupId: string;
  dto: UpdateMemberGroupDto;
}

export interface DeleteMemberGroupCommand {
  memberGroupId: string;
}

export interface MoveMemberGroupCommand {
  memberGroupId: string;
  direction: 'up' | 'down';
}

@Injectable()
export class MemberGroupApplicationService {
  private readonly logger = new Logger(MemberGroupApplicationService.name);

  constructor(
    @Inject('MemberGroupRepository')
    private readonly memberGroupRepository: MemberGroupRepository,
    private readonly memberGroupManagementDomainService: MemberGroupManagementDomainService,
  ) {}

  async createMemberGroup(
    command: CreateMemberGroupCommand,
  ): Promise<MemberGroup> {
    const { dto } = command;
    await this.memberGroupManagementDomainService.validateNameUniqueness(
      dto.name,
    );

    let order = dto.order;
    if (order === undefined || order === null) {
      const maxOrder = await this.memberGroupRepository.findMaxOrder();
      order = maxOrder + 1;
    }

    const memberGroup = MemberGroup.create(
      { name: dto.name, description: dto.description, order },
      '',
    );
    const created = await this.memberGroupRepository.create(memberGroup);
    this.logger.log(`Member group created: ${created.id} (${created.name})`);
    return created;
  }

  async updateMemberGroup(
    command: UpdateMemberGroupCommand,
  ): Promise<MemberGroup> {
    const { memberGroupId, dto } = command;
    const memberGroup =
      await this.memberGroupRepository.findById(memberGroupId);
    if (!memberGroup) {
      throw new MemberGroupNotFoundException(memberGroupId);
    }
    if (dto.name && dto.name !== memberGroup.name) {
      await this.memberGroupManagementDomainService.validateNameUniqueness(
        dto.name,
        memberGroupId,
      );
    }
    memberGroup.update(dto);
    await this.memberGroupRepository.save(memberGroup);
    this.logger.log(
      `Member group updated: ${memberGroup.id} (${memberGroup.name})`,
    );
    return memberGroup;
  }

  async findAll(includeInactive: boolean = false): Promise<MemberGroup[]> {
    return await this.memberGroupRepository.findAll(includeInactive);
  }

  async findById(id: string): Promise<MemberGroup> {
    const memberGroup = await this.memberGroupRepository.findById(id);
    if (!memberGroup) {
      throw new MemberGroupNotFoundException(id);
    }
    return memberGroup;
  }

  async deleteMemberGroup(command: DeleteMemberGroupCommand): Promise<void> {
    const { memberGroupId } = command;
    const memberGroup =
      await this.memberGroupRepository.findById(memberGroupId);
    if (!memberGroup) {
      throw new MemberGroupNotFoundException(memberGroupId);
    }
    const memberCount =
      await this.memberGroupRepository.countMembersByMemberGroupId(
        memberGroupId,
      );
    if (memberCount > 0) {
      memberGroup.deactivate();
      await this.memberGroupRepository.save(memberGroup);
    } else {
      await this.memberGroupRepository.delete(memberGroupId);
    }
    this.logger.log(
      `Member group deleted/deactivated: ${memberGroup.id} (${memberGroup.name})`,
    );
  }

  async moveMemberGroup(command: MoveMemberGroupCommand): Promise<MemberGroup> {
    const { memberGroupId, direction } = command;
    const memberGroup =
      await this.memberGroupRepository.findById(memberGroupId);
    if (!memberGroup) {
      throw new MemberGroupNotFoundException(memberGroupId);
    }

    const allGroups = await this.memberGroupRepository.findAll(true);
    const sortedGroups = allGroups.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });

    const currentIndex = sortedGroups.findIndex((g) => g.id === memberGroupId);
    if (currentIndex === -1) {
      throw new MemberGroupNotFoundException(memberGroupId);
    }

    let targetIndex: number;
    if (direction === 'up') {
      targetIndex = currentIndex - 1;
      if (targetIndex < 0) {
        throw new MemberGroupAlreadyAtTopException();
      }
    } else {
      targetIndex = currentIndex + 1;
      if (targetIndex >= sortedGroups.length) {
        throw new MemberGroupAlreadyAtBottomException();
      }
    }

    const targetGroup = sortedGroups[targetIndex];
    const tempOrder = memberGroup.order;
    memberGroup.changeOrder(targetGroup.order);
    targetGroup.changeOrder(tempOrder);

    await this.memberGroupRepository.save(memberGroup);
    await this.memberGroupRepository.save(targetGroup);

    this.logger.log(
      `Member group moved ${direction}: ${memberGroup.id} (${memberGroup.name})`,
    );
    return memberGroup;
  }
}
