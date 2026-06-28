/**
 * seed6.ts — Rol kataloğunu sıfırlar ve 5 özel rol + ADMIN oluşturur.
 *
 * Yapılanlar:
 *  - Panel kullanıcı başvuruları silinir (rol FK’si kalkmadan önce).
 *  - Bilinen demo/seed e-postaları (ör. ilçe temsilcisi, il başkanı) varsa kaldırılır.
 *  - Member.userId ile panele terfi edilmiş üyeler: bağ koparılır; User kaydı
 *    silinebiliyorsa silinir, FK engellerse pasif + roller temizlenir.
 *  - Admin dışı tüm kullanıcılardan rol atamaları kaldırılır (hesap kalır, izin yok).
 *  - Tüm CustomRole / izin / rol kapsamı kayıtları silinir.
 *  - ADMIN + 5 yeni rol oluşturulur; admin kullanıcıya ADMIN atanır.
 *
 * Çalıştırma: npx ts-node -r tsconfig-paths/register prisma/seed6.ts
 * veya: npm run prisma:seed6
 *
 * Gerekli env: ADMIN_EMAIL (sistemdeki admin kullanıcı e-postası)
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

/** Uygulama ADMIN adını bu isimle tanır; JWT’de tüm izinler verilir. */
const ADMIN_ROLE_NAME = 'ADMIN';

const ADMIN_ROLE_DB_PERMISSIONS = [
  'USER_LIST',
  'ROLE_LIST',
  'MEMBER_LIST',
];

/**
 * Eski seed / demo panel hesapları — varsa silinir (ADMIN_EMAIL asla dokunulmaz).
 */
const LEGACY_SEED_USER_EMAILS = [
  'ismail.cetin237@sendika.local',
  'burcu.dogan7@gmail.com',
  'ilce.temsilcisi@sendika.local',
  'il.baskani@sendika.local',
  'genel.baskan@sendika.local',
];

/**
 * Merkez operasyon: kullanıcı, rol, üye, kurum, içerik, rapor, onaylar vb.
 */
const ROLE_MERKEZ_OPERASYON = {
  name: 'MERKEZ_OPERASYON',
  description:
    'Merkez operasyon: kullanıcı/rol yönetimi, üyeler, kurumlar, içerik, raporlar, onaylar',
  hasScopeRestriction: false,
  permissions: [
    'USER_LIST',
    'USER_VIEW',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_SOFT_DELETE',
    'USER_ASSIGN_ROLE',
    'ROLE_LIST',
    'ROLE_VIEW',
    'ROLE_CREATE',
    'ROLE_UPDATE',
    'ROLE_DELETE',
    'ROLE_MANAGE_PERMISSIONS',
    'MEMBER_LIST',
    'MEMBER_VIEW',
    'MEMBER_CREATE_APPLICATION',
    'MEMBER_APPLICATIONS_VIEW',
    'MEMBER_APPROVE',
    'MEMBER_REJECT',
    'MEMBER_UPDATE',
    'MEMBER_STATUS_CHANGE',
    'MEMBER_HISTORY_VIEW',
    'REGION_LIST',
    'BRANCH_MANAGE',
    'BRANCH_ASSIGN_PRESIDENT',
    'CONTENT_MANAGE',
    'CONTENT_PUBLISH',
    'DOCUMENT_SYSTEM_ACCESS',
    'DOCUMENT_TEMPLATE_MANAGE',
    'DOCUMENT_MEMBER_HISTORY_VIEW',
    'DOCUMENT_GENERATE_PDF',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_DOWNLOAD',
    'REPORT_GLOBAL_VIEW',
    'REPORT_REGION_VIEW',
    'REPORT_MEMBER_STATUS_VIEW',
    'REPORT_DUES_VIEW',
    'WHATSAPP_CHAT_VIEW',
    'WHATSAPP_CHAT_SEND',
    'WHATSAPP_CHAT_MANAGE',
    'WHATSAPP_BULK_SEND',
    'WHATSAPP_TEMPLATE_VIEW',
    'WHATSAPP_TEMPLATE_MANAGE',
    'WHATSAPP_INSTANCE_MANAGE',
    'NOTIFY_ALL_MEMBERS',
    'NOTIFY_REGION',
    'NOTIFY_OWN_SCOPE',
    'SYSTEM_SETTINGS_VIEW',
    'SYSTEM_SETTINGS_MANAGE',
    'LOG_VIEW_ALL',
    'LOG_VIEW_OWN_SCOPE',
    'INSTITUTION_LIST',
    'INSTITUTION_VIEW',
    'INSTITUTION_CREATE',
    'INSTITUTION_UPDATE',
    'INSTITUTION_APPROVE',
    'PROFESSION_VIEW',
    'PROFESSION_CREATE',
    'PROFESSION_UPDATE',
    'PROFESSION_DELETE',
    'TEVKIFAT_VIEW',
    'TEVKIFAT_EXPORT',
    'TEVKIFAT_TITLE_VIEW',
    'TEVKIFAT_TITLE_CREATE',
    'TEVKIFAT_TITLE_UPDATE',
    'TEVKIFAT_TITLE_DELETE',
    'TEVKIFAT_CENTER_VIEW',
    'TEVKIFAT_CENTER_CREATE',
    'TEVKIFAT_CENTER_UPDATE',
    'TEVKIFAT_CENTER_DELETE',
    'PANEL_USER_APPLICATION_LIST',
    'PANEL_USER_APPLICATION_VIEW',
    'PANEL_USER_APPLICATION_APPROVE',
    'PANEL_USER_APPLICATION_REJECT',
    'APPROVAL_VIEW',
    'APPROVAL_APPROVE',
    'APPROVAL_REJECT',
    'MEMBER_PAYMENT_LIST',
    'MEMBER_PAYMENT_VIEW',
    'MEMBER_PAYMENT_APPROVE',
    'TEVKIFAT_FILE_APPROVE',
  ],
};

/**
 * Bölge: il/ilçe kapsamı + üye listesi; panelde yetki alanı atanmalı.
 */
const ROLE_BOLGE_YETKILISI = {
  name: 'BOLGE_YETKILISI',
  description:
    'İl/ilçe kapsamında üye işlemleri; MEMBER_LIST_BY_PROVINCE + rol kapsamı gerekir',
  hasScopeRestriction: true,
  permissions: [
    'MEMBER_LIST',
    'MEMBER_VIEW',
    'MEMBER_HISTORY_VIEW',
    'MEMBER_CREATE_APPLICATION',
    'MEMBER_UPDATE',
    'MEMBER_LIST_BY_PROVINCE',
    'REGION_LIST',
    'NOTIFY_OWN_SCOPE',
    'INSTITUTION_LIST',
    'INSTITUTION_VIEW',
    'DOCUMENT_UPLOAD',
    'PANEL_USER_APPLICATION_CREATE',
  ],
};

/**
 * Muhasebe: kesinti, avans, fatura, tevkifat girişi.
 */
const ROLE_MUHASEBE = {
  name: 'MUHASEBE',
  description: 'Muhasebe: kesintiler, avanslar, faturalar, tevkifat',
  hasScopeRestriction: false,
  permissions: [
    'TEVKIFAT_VIEW',
    'TEVKIFAT_EXPORT',
    'TEVKIFAT_TITLE_VIEW',
    'TEVKIFAT_TITLE_CREATE',
    'TEVKIFAT_TITLE_UPDATE',
    'TEVKIFAT_TITLE_DELETE',
    'TEVKIFAT_CENTER_VIEW',
    'TEVKIFAT_CENTER_CREATE',
    'TEVKIFAT_CENTER_UPDATE',
    'TEVKIFAT_CENTER_DELETE',
    'TEVKIFAT_FILE_UPLOAD',
    'TEVKIFAT_FILE_APPROVE',
    'MEMBER_PAYMENT_ADD',
    'MEMBER_PAYMENT_LIST',
    'MEMBER_PAYMENT_VIEW',
    'MEMBER_PAYMENT_APPROVE',
    'ADVANCE_VIEW',
    'ADVANCE_CREATE',
    'ADVANCE_UPDATE',
    'ADVANCE_DELETE',
    'ADVANCE_DOCUMENT',
    'INVOICE_VIEW',
    'INVOICE_CREATE',
    'INVOICE_UPDATE',
    'INVOICE_DELETE',
    'REPORT_DUES_VIEW',
    'MEMBER_VIEW',
    'MEMBER_LIST',
  ],
};

/**
 * İlçe Temsilcisi: ilçe bazlı (scope zorunlu) üye/evrak/fatura/kurum işlemleri.
 */
const ROLE_ILCE_TEMSILCISI = {
  name: 'ILCE_TEMSILCISI',
  description:
    'İlçe bazlı yetki: başvuru, kendi ilçesindeki üyeler, evrak görüntüleme, kurum/tevkifat/fatura ekranları',
  hasScopeRestriction: true,
  permissions: [
    'MEMBER_LIST',
    'MEMBER_VIEW',
    'MEMBER_CREATE_APPLICATION',
    'MEMBER_LIST_BY_PROVINCE',
    'REGION_LIST',
    'DOCUMENT_MEMBER_HISTORY_VIEW',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_DOWNLOAD',
    'INSTITUTION_LIST',
    'INSTITUTION_VIEW',
    'INSTITUTION_CREATE',
    'TEVKIFAT_VIEW',
    'TEVKIFAT_TITLE_VIEW',
    'TEVKIFAT_CENTER_VIEW',
    'INVOICE_VIEW',
  ],
};

/**
 * İl Temsilcisi: İlçe Temsilcisi ile aynı yetkiler, il bazlı scope ile kullanılır.
 */
const ROLE_IL_TEMSILCISI = {
  name: 'IL_TEMSILCISI',
  description:
    'İl bazlı yetki: ilçe temsilcisi ile aynı izinler, sadece kendi il kapsamındaki veriler',
  hasScopeRestriction: true,
  permissions: [...ROLE_ILCE_TEMSILCISI.permissions, 'MEMBER_UPDATE'],
};

async function disconnectAllCustomRoles(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { customRoles: { set: [] } },
  });
}

async function deactivateUser(userId: string) {
  await disconnectAllCustomRoles(userId);
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
}

/** Bilinen demo kullanıcılarını kaldırır; FK engelinde pasifleştirir. */
async function removeLegacySeedUsers(
  emails: string[],
  adminId: string,
  adminEmail: string,
) {
  const adminLower = adminEmail.trim().toLowerCase();
  console.log('🧹 Bilinen demo / eski seed panel kullanıcıları kontrol ediliyor...');
  let removed = 0;
  for (const raw of emails) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === adminLower) {
      console.log(`   ⏭️ Atlandı (ADMIN_EMAIL): ${trimmed}`);
      continue;
    }
    const user = await prisma.user.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
    });
    if (!user) {
      continue;
    }
    if (user.id === adminId) {
      console.log(`   ⏭️ Atlandı (admin id): ${user.email}`);
      continue;
    }

    await prisma.member.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    });
    await prisma.userScope.deleteMany({ where: { userId: user.id } });
    await prisma.branch.updateMany({
      where: { presidentId: user.id },
      data: { presidentId: null },
    });
    await disconnectAllCustomRoles(user.id);

    try {
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`   ✅ Kaldırıldı: ${user.email}`);
      removed++;
    } catch (e: unknown) {
      console.warn(
        `   ⚠️ Silinemedi (FK), pasifleştirildi: ${user.email} —`,
        e instanceof Error ? e.message : e,
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false, deletedAt: new Date() },
      });
      removed++;
    }
  }
  if (removed === 0) {
    console.log('   — Listede kayıtlı eşleşen kullanıcı yok');
  }
  console.log('');
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL .env içinde tanımlı olmalı.');
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!adminUser) {
    throw new Error(
      `Admin kullanıcı bulunamadı: ${adminEmail}. Önce seed4 veya uygun seed ile admin oluşturun.`,
    );
  }

  const adminId = adminUser.id;

  console.log('🌱 seed6: Rol sıfırlama ve yeni rol seti...\n');

  // 1) Panel başvuruları (CustomRole’a FK)
  console.log('📋 Panel kullanıcı başvuruları siliniyor...');
  await prisma.panelUserApplicationScope.deleteMany();
  await prisma.panelUserApplication.deleteMany();
  console.log('   ✅ Tamam\n');

  await removeLegacySeedUsers(LEGACY_SEED_USER_EMAILS, adminId, adminEmail);

  // 2) Üye → panel User bağını kaldır; terfi eden User’ları sil veya pasifleştir
  console.log('👤 Terfi eden üyeler (Member.userId) işleniyor...');
  const promoted = await prisma.member.findMany({
    where: {
      userId: { not: null },
    },
    select: { id: true, userId: true },
  });

  const promotedUserIds = Array.from(
    new Set(
      promoted
        .map((m) => m.userId)
        .filter((id): id is string => !!id && id !== adminId),
    ),
  );

  if (promotedUserIds.length > 0) {
    await prisma.member.updateMany({
      where: { userId: { in: promotedUserIds } },
      data: { userId: null },
    });

    for (const uid of promotedUserIds) {
      try {
        await prisma.user.delete({ where: { id: uid } });
        console.log(`   ✅ User silindi: ${uid}`);
      } catch (e: unknown) {
        console.warn(
          `   ⚠️ User silinemedi (${uid}), pasifleştiriliyor (FK):`,
          e instanceof Error ? e.message : e,
        );
        await deactivateUser(uid);
      }
    }
  } else {
    console.log('   (Terfi eden üye yok)');
  }
  console.log('');

  // 3) Admin dışı tüm kullanıcılardan rolleri kaldır
  console.log('🔓 Diğer panel kullanıcılarının rolleri temizleniyor...');
  const otherUsers = await prisma.user.findMany({
    where: { id: { not: adminId }, deletedAt: null },
    select: { id: true, email: true },
  });
  for (const u of otherUsers) {
    await disconnectAllCustomRoles(u.id);
    console.log(`   • ${u.email}`);
  }
  console.log('   ✅ Tamam\n');

  // 4) Admin’in rolleri + tüm kullanıcı scope (admin hariç)
  await disconnectAllCustomRoles(adminId);
  await prisma.userScope.deleteMany({
    where: { userId: { not: adminId } },
  });

  // 5) Eski roller
  console.log('🗑️ Eski CustomRole kayıtları siliniyor...');
  await prisma.customRolePermission.deleteMany();
  await prisma.customRoleScope.deleteMany();
  await prisma.customRole.deleteMany();
  console.log('   ✅ Tamam\n');

  // 6) Yeni roller
  console.log('🎭 Yeni roller oluşturuluyor...');

  const adminRole = await prisma.customRole.create({
    data: {
      name: ADMIN_ROLE_NAME,
      description: 'Sistem yöneticisi — uygulama tüm izinleri ADMIN adıyla tanır',
      isActive: true,
      hasScopeRestriction: false,
      permissions: {
        create: ADMIN_ROLE_DB_PERMISSIONS.map((permission) => ({ permission })),
      },
    },
  });
  console.log(`   ✅ ${ADMIN_ROLE_NAME}`);

  const templates = [
    ROLE_MERKEZ_OPERASYON,
    ROLE_BOLGE_YETKILISI,
    ROLE_MUHASEBE,
    ROLE_ILCE_TEMSILCISI,
    ROLE_IL_TEMSILCISI,
  ];
  for (const t of templates) {
    await prisma.customRole.create({
      data: {
        name: t.name,
        description: t.description,
        isActive: true,
        hasScopeRestriction: t.hasScopeRestriction,
        permissions: {
          create: t.permissions.map((permission) => ({ permission })),
        },
      },
    });
    console.log(`   ✅ ${t.name} (${t.permissions.length} izin)`);
  }

  await prisma.user.update({
    where: { id: adminId },
    data: {
      customRoles: { connect: { id: adminRole.id } },
    },
  });
  console.log(`\n👤 Admin kullanıcıya ${ADMIN_ROLE_NAME} atandı: ${adminEmail}\n`);

  console.log('✅ seed6 tamamlandı.');
  console.log(
    '   Oluşturulan roller: ADMIN, MERKEZ_OPERASYON, BOLGE_YETKILISI, MUHASEBE, ILCE_TEMSILCISI, IL_TEMSILCISI',
  );
  console.log(
    '   Not: Admin dışı kullanıcıların rolü yok; panel erişimi için USER_ASSIGN_ROLE ile yeniden atama yapın.',
  );
}

main()
  .catch((e) => {
    console.error('❌ seed6 hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
