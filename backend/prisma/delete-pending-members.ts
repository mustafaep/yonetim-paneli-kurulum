/**
 * delete-pending-members.ts
 *
 * PENDING (başvuru aşamasındaki) statüdeki tüm üyeleri ve
 * onlara ait tüm bağlı verileri veritabanından siler.
 *
 * Cascade ile otomatik silinen tablolar:
 *   MemberHistory, MemberPayment, MemberAdvance, MemberMembershipPeriod
 *
 * Manuel silinen tablolar:
 *   PanelUserApplicationScope → PanelUserApplication → MemberDocument
 *   NotificationRecipient, Approval
 */

import { PrismaClient, MemberStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 PENDING statüdeki üyeler aranıyor...');

  const pendingMembers = await prisma.member.findMany({
    where: { status: MemberStatus.PENDING },
    select: { id: true, firstName: true, lastName: true, nationalId: true },
  });

  if (pendingMembers.length === 0) {
    console.log('✅ Silinecek PENDING üye bulunamadı.');
    return;
  }

  console.log(`⚠️  ${pendingMembers.length} adet PENDING üye bulundu:`);
  pendingMembers.forEach((m) =>
    console.log(`   - ${m.firstName} ${m.lastName} (${m.nationalId})`),
  );

  const memberIds = pendingMembers.map((m) => m.id);

  // ─── 1. PanelUserApplicationScope ───
  console.log('\n🗑️  PanelUserApplicationScope siliniyor...');
  const applications = await prisma.panelUserApplication.findMany({
    where: { memberId: { in: memberIds } },
    select: { id: true },
  });
  const applicationIds = applications.map((a) => a.id);

  if (applicationIds.length > 0) {
    const { count: scopeCount } =
      await prisma.panelUserApplicationScope.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
    console.log(`   ✅ ${scopeCount} PanelUserApplicationScope silindi`);
  }

  // ─── 2. PanelUserApplication ───
  console.log('🗑️  PanelUserApplication siliniyor...');
  const { count: appCount } = await prisma.panelUserApplication.deleteMany({
    where: { memberId: { in: memberIds } },
  });
  console.log(`   ✅ ${appCount} PanelUserApplication silindi`);

  // ─── 3. MemberDocument ───
  console.log('🗑️  MemberDocument siliniyor...');
  const { count: docCount } = await prisma.memberDocument.deleteMany({
    where: { memberId: { in: memberIds } },
  });
  console.log(`   ✅ ${docCount} MemberDocument silindi`);

  // ─── 4. NotificationRecipient ───
  console.log('🗑️  NotificationRecipient siliniyor...');
  const { count: recipientCount } =
    await prisma.notificationRecipient.deleteMany({
      where: { memberId: { in: memberIds } },
    });
  console.log(`   ✅ ${recipientCount} NotificationRecipient silindi`);

  // ─── 5. Approval (entityId üzerinden - FK constraint yok) ───
  console.log('🗑️  Approval kayıtları siliniyor...');
  const { count: approvalCount } = await prisma.approval.deleteMany({
    where: { entityId: { in: memberIds } },
  });
  console.log(`   ✅ ${approvalCount} Approval silindi`);

  // ─── 6. Member (cascade: MemberHistory, MemberPayment, MemberAdvance, MemberMembershipPeriod) ───
  console.log('🗑️  Üyeler siliniyor...');
  const { count: memberCount } = await prisma.member.deleteMany({
    where: { status: MemberStatus.PENDING },
  });
  console.log(`   ✅ ${memberCount} üye silindi`);

  console.log(`\n✅ İşlem tamamlandı. Toplam ${memberCount} PENDING üye silindi.`);
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
