/**
 * seed4.ts - Tüm verileri temizler ve temel verileri ekler.
 *
 * Eklenenler:
 *  - Tüm iller ve ilçeler (sehirler.json / ilceler.json)
 *  - Admin kullanıcısı (.env'den ADMIN_EMAIL / ADMIN_PASSWORD)
 *  - 1 adet üye grubu (seed.ts ile aynı: 'Üye')
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Yerel geliştirme için backend/.env dosyasını yükle.
// Docker/VPS ortamında env değişkenleri docker-compose üzerinden zaten set edilmiştir.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface SehirData {
  sehir_id: string;
  sehir_adi: string;
}

interface IlceData {
  ilce_id: string;
  ilce_adi: string;
  sehir_id: string;
  sehir_adi: string;
}

const isProduction = __dirname.includes('dist');
const prismaDir = isProduction ? path.join(__dirname, '..', '..', 'prisma') : __dirname;

const sehirlerData: SehirData[] = JSON.parse(
  fs.readFileSync(path.join(prismaDir, 'sehirler.json'), 'utf-8'),
);
const ilcelerData: IlceData[] = JSON.parse(
  fs.readFileSync(path.join(prismaDir, 'ilceler.json'), 'utf-8'),
);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 seed4: Veriler temizleniyor ve temel veriler ekleniyor...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      '❌ ADMIN_EMAIL veya ADMIN_PASSWORD .env dosyasında tanımlı değil.',
    );
  }

  // ─── 1. Tüm Verileri Temizle ───
  console.log('🗑️  Mevcut veriler temizleniyor...');

  await prisma.memberPayment.deleteMany();

  try {
    await prisma.memberAdvance.deleteMany();
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('MemberAdvance')) {
      console.log('   ⚠️  MemberAdvance tablosu bulunamadı, atlanıyor...');
    } else {
      throw error;
    }
  }

  try {
    await prisma.memberMembershipPeriod.deleteMany();
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('MemberMembershipPeriod')) {
      console.log('   ⚠️  MemberMembershipPeriod tablosu bulunamadı, atlanıyor...');
    } else {
      throw error;
    }
  }

  await prisma.userNotification.deleteMany();

  try {
    await prisma.notificationRecipient.deleteMany();
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('   ⚠️  NotificationRecipient tablosu bulunamadı, atlanıyor...');
    } else {
      throw error;
    }
  }

  try {
    await prisma.notificationLog.deleteMany();
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('   ⚠️  NotificationLog tablosu bulunamadı, atlanıyor...');
    } else {
      throw error;
    }
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

  console.log('   ✅ Tüm veriler temizlendi');

  // ─── 2. İller ───
  console.log('📍 İller ekleniyor...');
  const provinceMapBySehirId: Record<string, string> = {};

  for (const sehir of sehirlerData) {
    const created = await prisma.province.create({
      data: {
        name: sehir.sehir_adi,
        code: sehir.sehir_id.padStart(2, '0'),
      },
    });
    provinceMapBySehirId[sehir.sehir_id] = created.id;
  }
  console.log(`   ✅ ${sehirlerData.length} il eklendi`);

  // ─── 3. İlçeler ───
  console.log('🏘️  İlçeler ekleniyor...');
  let ilceCount = 0;

  for (const ilce of ilcelerData) {
    const provinceId = provinceMapBySehirId[ilce.sehir_id];
    if (!provinceId) continue;
    await prisma.district.create({
      data: {
        name: ilce.ilce_adi,
        provinceId,
      },
    });
    ilceCount++;
  }
  console.log(`   ✅ ${ilceCount} ilçe eklendi`);

  // ─── 4. Admin Rolü ───
  console.log('🎭 Admin rolü ekleniyor...');
  const adminRole = await prisma.customRole.create({
    data: {
      name: 'ADMIN',
      description: 'Admin rolü',
      isActive: true,
      permissions: {
        create: [
          { permission: 'USER_LIST' },
          { permission: 'USER_VIEW' },
          { permission: 'USER_CREATE' },
          { permission: 'USER_UPDATE' },
          { permission: 'MEMBER_LIST' },
          { permission: 'MEMBER_VIEW' },
          { permission: 'MEMBER_HISTORY_VIEW' },
          { permission: 'MEMBER_CREATE_APPLICATION' },
          { permission: 'MEMBER_APPROVE' },
        ],
      },
    },
  });
  console.log('   ✅ Admin rolü oluşturuldu');

  // ─── 5. Admin Kullanıcısı ───
  console.log(`👤 Admin kullanıcısı ekleniyor: ${adminEmail}`);
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      customRoles: { connect: { id: adminRole.id } },
    },
  });
  console.log('   ✅ Admin kullanıcısı oluşturuldu');

  // ─── 6. Üye Grubu ───
  console.log('👥 Üye grubu ekleniyor...');
  await prisma.memberGroup.create({
    data: {
      name: 'Üye',
      description: 'Üye grubu',
      order: 1,
    },
  });
  console.log('   ✅ 1 üye grubu eklendi');

  console.log('\n✅ seed4 tamamlandı.');
  console.log(`   - Admin: ${adminEmail}`);
  console.log('   - Üye grubu: Üye');
}

main()
  .catch((e) => {
    console.error('❌ seed4 hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
