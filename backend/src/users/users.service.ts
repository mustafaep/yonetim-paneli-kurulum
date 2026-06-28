import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './application/dto/create-user.dto';
import { UserCreationApplicationService } from './application/services/user-creation-application.service';
import { PasswordService } from '../auth/infrastructure/services/password.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private userCreationService: UserCreationApplicationService,
    private passwordService: PasswordService,
  ) {}

  async create(dto: CreateUserDto, memberId?: string) {
    const user = await this.userCreationService.createUser({
      dto,
      memberId,
    });

    return await this.findById(user.id);
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            permissions: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            email: true,
            phone: true,
            status: true,
            registrationNumber: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    // Geçici: customRoles tablosu yoksa include etme
    try {
      return await this.prisma.user.findFirst({
        where: { email },
        include: {
          customRoles: {
            where: {
              deletedAt: null,
              isActive: true,
            },
            include: {
              permissions: true,
            },
          },
        },
      });
    } catch (error: any) {
      // Eğer _UserCustomRoles tablosu yoksa, customRoles olmadan döndür
      if (
        error?.message?.includes('_UserCustomRoles') ||
        error?.message?.includes('does not exist')
      ) {
        return this.prisma.user.findFirst({
          where: { email },
        });
      }
      throw error;
    }
  }

  async findById(id: string) {
    // Geçici: customRoles tablosu yoksa include etme
    try {
      return await this.prisma.user.findFirst({
        where: { id },
        include: {
          customRoles: {
            where: {
              deletedAt: null,
              isActive: true,
            },
            include: {
              permissions: true,
            },
          },
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
    } catch (error: any) {
      // Eğer _UserCustomRoles tablosu yoksa, customRoles olmadan döndür
      if (
        error?.message?.includes('_UserCustomRoles') ||
        error?.message?.includes('does not exist')
      ) {
        return this.prisma.user.findFirst({
          where: { id },
          include: {
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
      }
      throw error;
    }
  }

  async updateUserRoles(userId: string, customRoleIds: string[]) {
    // Önce kullanıcının var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Tüm mevcut rolleri kaldır ve yenilerini ata
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        customRoles: {
          set: customRoleIds.map((id) => ({ id })),
        },
      },
      include: {
        customRoles: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  async updateAccount(
    userId: string,
    data: { email: string; password?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const emailOwner = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (emailOwner) {
      throw new ConflictException('Bu email adresi başka bir kullanıcıda kayıtlı');
    }

    const updateData: { email: string; passwordHash?: string } = {
      email: normalizedEmail,
    };

    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = await this.passwordService.hashWithPolicy(
        data.password,
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.findById(userId);
  }
}
