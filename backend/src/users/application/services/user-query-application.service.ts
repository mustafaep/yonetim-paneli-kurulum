/**
 * User Query Application Service
 *
 * Handles user query operations.
 */
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import type { UserRepository } from '../../domain/repositories/user.repository.interface';
import { Email } from '../../domain/value-objects/email.vo';
import { UserNotFoundException } from '../../domain/exceptions/user-domain.exception';

@Injectable()
export class UserQueryApplicationService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailVO = Email.create(email);
    return await this.userRepository.findByEmail(emailVO);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.findAll();
  }
}
