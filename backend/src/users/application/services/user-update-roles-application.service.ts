/**
 * User Update Roles Application Service
 *
 * Orchestrates user roles update use case.
 */
import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository.interface';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception';

export interface UpdateUserRolesCommand {
  userId: string;
  customRoleIds: string[];
}

@Injectable()
export class UserUpdateRolesApplicationService {
  private readonly logger = new Logger(UserUpdateRolesApplicationService.name);

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async updateRoles(command: UpdateUserRolesCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    user.updateRoles({ customRoleIds: command.customRoleIds });
    await this.userRepository.save(user);

    this.logger.log(`User roles updated: ${user.id}`);

    return user;
  }
}
