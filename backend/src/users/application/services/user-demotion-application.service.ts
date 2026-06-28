import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UserDemotionApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Üyeden gelen panel kullanıcısını kaldırır: üye–kullanıcı bağını koparır,
   * kullanıcıyı pasifleştirir, oturumları ve yetki alanlarını temizler.
   * E-postayı benzersiz tutmak için arşiv adresine çevirir (yeniden terfi aynı e-posta ile mümkün olsun).
   */
  async demoteMemberLinkedPanelUser(
    userId: string,
    actorUserId: string,
  ): Promise<void> {
    if (userId === actorUserId) {
      throw new ForbiddenException('Kendi panel erişiminizi bu işlemle kaldıramazsınız.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        member: true,
        customRoles: {
          where: { deletedAt: null, isActive: true },
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const member = user.member;
    if (!member || member.userId !== user.id) {
      throw new BadRequestException(
        'Bu işlem yalnızca bir üyeye bağlı panel kullanıcıları için geçerlidir.',
      );
    }

    const isAdmin = user.customRoles.some((r) => r.name === 'ADMIN');
    if (isAdmin) {
      throw new BadRequestException('ADMIN rolündeki kullanıcılar üyeliğe düşürülemez.');
    }

    const archivedEmail = `revoked.${user.id}@panel-archived.invalid`;

    await this.prisma.$transaction(async (tx) => {
      await tx.panelUserApplication.deleteMany({
        where: { memberId: member.id },
      });

      await tx.member.update({
        where: { id: member.id },
        data: { userId: null },
      });

      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.userScope.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          email: archivedEmail,
          customRoles: { set: [] },
          isActive: false,
          deletedAt: new Date(),
        },
      });
    });
  }
}
