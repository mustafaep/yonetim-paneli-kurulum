import { PrismaClient } from '@prisma/client';

/** Yalnızca portfolio / Mustafa instance seed öncesi — MKÜ DB'de çalıştırmayın. */
export async function wipePortfolioDatabase(prisma: PrismaClient) {
  console.log('🗑️  Portfolio veritabanı temizleniyor...');

  await prisma.memberPayment.deleteMany();
  try {
    await prisma.memberAdvance.deleteMany();
  } catch {
    /* tablo yoksa atla */
  }
  try {
    await prisma.memberMembershipPeriod.deleteMany();
  } catch {
    /* */
  }
  await prisma.userNotification.deleteMany();
  try {
    await prisma.notificationRecipient.deleteMany();
  } catch {
    /* */
  }
  try {
    await prisma.notificationLog.deleteMany();
  } catch {
    /* */
  }
  await prisma.userNotificationSettings.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.tevkifatFile.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.memberHistory.deleteMany();
  await prisma.memberDocument.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.content.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.panelUserApplicationScope.deleteMany();
  await prisma.panelUserApplication.deleteMany();
  await prisma.member.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.tevkifatTitle.deleteMany();
  await prisma.tevkifatCenter.deleteMany();
  await prisma.membershipInfoOption.deleteMany();
  await prisma.memberGroup.deleteMany();
  await prisma.profession.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.userScope.deleteMany();
  await prisma.customRoleScope.deleteMany();
  await prisma.customRolePermission.deleteMany();
  await prisma.customRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.district.deleteMany();
  await prisma.province.deleteMany();

  console.log('   ✅ Temizlik tamam');
}
