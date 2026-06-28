import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MemberHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Üye güncelleme geçmişini kaydet
   */
  async logMemberUpdate(
    memberId: string,
    changedBy: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const updatedFields: Record<string, { old: any; new: any }> = {};
    const deletedFields: string[] = [];

    // Değişen alanları bul
    Object.keys(newData).forEach((key) => {
      if (oldData[key] !== newData[key]) {
        updatedFields[key] = {
          old: oldData[key] ?? null,
          new: newData[key] ?? null,
        };
      }
    });

    // Silinen alanları bul
    Object.keys(oldData).forEach((key) => {
      if (
        !(key in newData) &&
        oldData[key] !== null &&
        oldData[key] !== undefined
      ) {
        deletedFields.push(key);
      }
    });

    if (Object.keys(updatedFields).length === 0 && deletedFields.length === 0) {
      return; // Değişiklik yok
    }

    await this.prisma.memberHistory.create({
      data: {
        memberId,
        action: 'UPDATE',
        changedBy,
        updatedFields:
          Object.keys(updatedFields).length > 0 ? updatedFields : undefined,
        deletedFields: deletedFields.length > 0 ? deletedFields : undefined,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Üye oluşturma geçmişini kaydet
   */
  async logMemberCreate(
    memberId: string,
    changedBy: string,
    data: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.memberHistory.create({
      data: {
        memberId,
        action: 'CREATE',
        changedBy,
        newValue: JSON.stringify(data),
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Üye silme geçmişini kaydet
   */
  async logMemberDelete(
    memberId: string,
    changedBy: string,
    data: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.memberHistory.create({
      data: {
        memberId,
        action: 'DELETE',
        changedBy,
        oldValue: JSON.stringify(data),
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Üyenin geçmişini getir
   */
  async getMemberHistory(memberId: string) {
    return this.prisma.memberHistory.findMany({
      where: { memberId },
      include: {
        changedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
