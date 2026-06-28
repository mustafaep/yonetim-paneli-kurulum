/**
 * Prisma User Repository Implementation
 *
 * Infrastructure layer: Implements User repository interface.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
        scopes: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            phone: true,
            email: true,
            status: true,
            registrationNumber: true,
          },
        },
      },
    });

    if (!data) {
      return null;
    }

    return User.fromPersistence(data);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const data = await this.prisma.user.findFirst({
      where: {
        email: email.value,
        deletedAt: null,
      },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
        scopes: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            phone: true,
            email: true,
            status: true,
            registrationNumber: true,
          },
        },
      },
    });

    if (!data) {
      return null;
    }

    return User.fromPersistence(data);
  }

  async findAll(): Promise<User[]> {
    const data = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
        scopes: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            phone: true,
            email: true,
            status: true,
            registrationNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data.map((item) => User.fromPersistence(item));
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        deletedAt: user.deletedAt,
        updatedAt: user.updatedAt,
        customRoles: {
          set: user.customRoleIds.map((id) => ({ id })),
        },
      },
    });
  }

  async create(user: User): Promise<User> {
    const createData: any = {
      email: user.email,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      customRoles:
        user.customRoleIds.length > 0
          ? {
              connect: user.customRoleIds.map((id) => ({ id })),
            }
          : undefined,
    };

    delete createData.id;

    const created = await this.prisma.user.create({
      data: createData,
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
        },
        scopes: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            phone: true,
            email: true,
            status: true,
            registrationNumber: true,
          },
        },
      },
    });

    return User.fromPersistence(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
