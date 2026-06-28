/**
 * Portfolio demo seed — YALNIZCA Mustafa instance (.env.mustafa / mustafa-postgres).
 *
 * MKÜ (yonetim-paneli / .env) üzerinde ÇALIŞTIRMAYIN.
 *
 * Kullanım (VPS Mustafa backend):
 *   PORTFOLIO_SEED_ENABLED=true \
 *   docker compose -f docker-compose.yml -f docker-compose.mustafa.yml --env-file .env.mustafa \
 *     exec -e PORTFOLIO_SEED_ENABLED=true backend \
 *     npx ts-node -r tsconfig-paths/register prisma/seed-portfolio-mustafa.ts
 *
 * Yerel:
 *   cd backend && PORTFOLIO_SEED_ENABLED=true DATABASE_URL=... npm run prisma:seed-portfolio
 */

import {
  ContentStatus,
  ContentType,
  EducationStatus,
  Gender,
  InvoiceStatus,
  MemberSource,
  MemberStatus,
  PaymentType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { upsertDocumentTemplates } from './seed5';
import { seedPortfolioRoles } from './seed-data/portfolio-roles';
import { wipePortfolioDatabase } from './seed-data/portfolio-wipe';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Zeynep', 'Mustafa', 'Elif', 'Burak',
  'Deniz', 'Selin', 'Emre', 'Canan', 'Hakan', 'Merve', 'Oğuz', 'Esra',
  'Kerem', 'Gamze', 'Tolga', 'Pınar',
];
const LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Aydın', 'Öztürk',
  'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Koç', 'Kurt', 'Özdemir',
  'Polat', 'Aksoy', 'Erdoğan', 'Güneş',
];

function assertPortfolioSeedSafe() {
  if (process.env.PORTFOLIO_SEED_ENABLED !== 'true') {
    throw new Error(
      '❌ PORTFOLIO_SEED_ENABLED=true gerekli. Bu seed yalnızca Mustafa portfolio instance içindir.',
    );
  }
  const dbHint = `${process.env.POSTGRES_DB || ''} ${process.env.DATABASE_URL || ''}`.toLowerCase();
  if (
    dbHint.includes('yonetim_paneli') &&
    !dbHint.includes('mustafa') &&
    !dbHint.includes('portfolio')
  ) {
    throw new Error(
      '❌ Veritabanı Mustafa/portfolio gibi görünmüyor (MKÜ DB riski). POSTGRES_DB veya DATABASE_URL kontrol edin.',
    );
  }
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function nationalIdForIndex(i: number): string {
  return `9${String(100000000 + i).slice(-10)}`;
}

async function seedRegions() {
  const isProduction = __dirname.includes('dist');
  const prismaDir = isProduction ? path.join(__dirname, '..', '..', 'prisma') : __dirname;
  const sehirler: { sehir_id: string; sehir_adi: string }[] = JSON.parse(
    fs.readFileSync(path.join(prismaDir, 'sehirler.json'), 'utf-8'),
  );
  const ilceler: {
    ilce_id: string;
    ilce_adi: string;
    sehir_id: string;
  }[] = JSON.parse(fs.readFileSync(path.join(prismaDir, 'ilceler.json'), 'utf-8'));

  const provinceMap: Record<string, string> = {};
  for (const s of sehirler) {
    const p = await prisma.province.create({
      data: { name: s.sehir_adi, code: s.sehir_id.padStart(2, '0') },
    });
    provinceMap[s.sehir_id] = p.id;
  }

  const districtByProvince: Record<string, { id: string; name: string }[]> = {};
  for (const ilce of ilceler) {
    const provinceId = provinceMap[ilce.sehir_id];
    if (!provinceId) continue;
    const d = await prisma.district.create({
      data: { name: ilce.ilce_adi, provinceId },
    });
    if (!districtByProvince[provinceId]) districtByProvince[provinceId] = [];
    districtByProvince[provinceId].push({ id: d.id, name: d.name });
  }

  console.log(`   ✅ ${sehirler.length} il, ${ilceler.length} ilçe`);
  return { provinceMap, districtByProvince, sehirler };
}

async function main() {
  assertPortfolioSeedSafe();

  console.log('🌱 Portfolio Mustafa seed başlıyor...\n');

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const demoPassword =
    process.env.PORTFOLIO_DEMO_PASSWORD?.trim() || adminPassword || 'Portfolio2026!';

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL ve ADMIN_PASSWORD tanımlı olmalı (.env.mustafa).');
  }

  await wipePortfolioDatabase(prisma);

  console.log('📍 Bölgeler...');
  const { provinceMap, districtByProvince } = await seedRegions();

  const ankaraId = provinceMap['6'];
  const istanbulId = provinceMap['34'];
  const izmirId = provinceMap['35'];
  const focusProvinceIds = [ankaraId, istanbulId, izmirId].filter(Boolean) as string[];

  console.log('🎭 Roller (seed7 seti)...');
  const roles = await seedPortfolioRoles(prisma);

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const demoHash = await bcrypt.hash(demoPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'Mustafa',
      lastName: 'Portakal',
      customRoles: { connect: { id: roles.ADMIN } },
    },
  });

  const ikEmail =
    process.env.PORTFOLIO_DEMO_IK_EMAIL?.trim() || 'ik@yonetim.portfolio';
  await prisma.user.create({
    data: {
      email: ikEmail,
      passwordHash: demoHash,
      firstName: 'İnsan',
      lastName: 'Kaynakları',
      customRoles: { connect: { id: roles.GENEL_BASKAN } },
    },
  });

  await prisma.user.create({
    data: {
      email: 'muhasebe@yonetim.portfolio',
      passwordHash: demoHash,
      firstName: 'Muhasebe',
      lastName: 'Birimi',
      customRoles: { connect: { id: roles.IL_BASKANI } },
    },
  });

  console.log(`   ✅ Panel kullanıcıları (admin: ${adminEmail}, IK: ${ikEmail})`);

  const memberGroup = await prisma.memberGroup.create({
    data: { name: 'Üye', description: 'Asıl üye grubu', order: 1 },
  });
  const fahriGroup = await prisma.memberGroup.create({
    data: { name: 'Fahri Üye', description: 'Fahri üyelik', order: 2 },
  });

  const membershipOptions = await Promise.all(
    ['Normal Üye', 'Kadrolu Üye', 'Sözleşmeli Üye'].map((label, i) =>
      prisma.membershipInfoOption.create({
        data: {
          label,
          value: `opt_${i + 1}`,
          description: `${label} kategorisi`,
          order: i + 1,
        },
      }),
    ),
  );

  const professions = await Promise.all(
    ['Hemşire', 'Ebe', 'Sağlık Teknikeri', 'Doktor', 'Biyolog'].map((name) =>
      prisma.profession.create({ data: { name, isActive: true } }),
    ),
  );

  const tevkifatTitles = await Promise.all(
    ['Başhekim', 'Müdür', 'Şef', 'Uzman'].map((name) =>
      prisma.tevkifatTitle.create({ data: { name, isActive: true } }),
    ),
  );

  const tevkifatCenters: { id: string }[] = [];
  for (const [name, pid] of [
    ['Ankara Merkez Tevkifat', ankaraId],
    ['İstanbul Avrupa Tevkifat', istanbulId],
    ['İzmir Tevkifat', izmirId],
  ] as const) {
    if (!pid) continue;
    tevkifatCenters.push(
      await prisma.tevkifatCenter.create({
        data: { name, provinceId: pid, isActive: true },
      }),
    );
  }

  const institutions: { id: string }[] = [];
  const institutionNames = [
    'Ankara Şehir Hastanesi',
    'Hacettepe Üniversitesi Hastanesi',
    'İstanbul Eğitim Araştırma',
    'Kartal Dr. Lütfi Kırdar',
    'İzmir Katip Çelebi',
    'Ege Üniversitesi Hastanesi',
    'Gazi Yaşargil EAH',
    'Uludağ Üniversitesi Hastanesi',
  ];
  for (let i = 0; i < institutionNames.length; i++) {
    const pid = pick(focusProvinceIds, i);
    const districts = districtByProvince[pid] || [];
    const districtId = districts[0]?.id;
    const inst = await prisma.institution.create({
      data: {
        name: institutionNames[i],
        provinceId: pid,
        districtId,
        isActive: true,
        approvedAt: new Date(),
        approvedBy: adminUser.id,
      },
    });
    institutions.push({ id: inst.id });
  }

  const branches: { id: string }[] = [];
  for (const [label, pid] of [
    ['Ankara Şube', ankaraId],
    ['İstanbul Şube', istanbulId],
    ['İzmir Şube', izmirId],
  ] as const) {
    if (!pid) continue;
    branches.push(
      await prisma.branch.create({
        data: {
          name: label,
          provinceId: pid,
          isActive: true,
          branchSharePercent: new Prisma.Decimal(40),
        },
      }),
    );
  }

  console.log('👥 Üyeler, ödemeler, içerik...');

  const ACTIVE_COUNT = 140;
  const PENDING_COUNT = 15;
  const APPROVED_COUNT = 10;
  const TOTAL = ACTIVE_COUNT + PENDING_COUNT + APPROVED_COUNT;

  const activeMembers: { id: string; registrationNumber: string }[] = [];
  let regCounter = 20240001;

  for (let i = 0; i < TOTAL; i++) {
    const pid = pick(focusProvinceIds, i);
    const districts = districtByProvince[pid] || [];
    const district = districts[i % districts.length] || districts[0];
    if (!district) continue;

    const inst = institutions[i % institutions.length];
    let status: MemberStatus = MemberStatus.ACTIVE;
    let approvedAt: Date | null = new Date(2024, (i % 12), 1 + (i % 20));
    let registrationNumber: string | null = `UYE-${regCounter++}`;

    if (i >= ACTIVE_COUNT + APPROVED_COUNT) {
      status = MemberStatus.PENDING;
      approvedAt = null;
      registrationNumber = null;
    } else if (i >= ACTIVE_COUNT) {
      status = MemberStatus.APPROVED;
      approvedAt = new Date();
    }

    const member = await prisma.member.create({
      data: {
        firstName: pick(FIRST_NAMES, i),
        lastName: pick(LAST_NAMES, i + 3),
        nationalId: nationalIdForIndex(i),
        phone: `05${30 + (i % 10)}${String(1000000 + i).slice(-7)}`,
        email: `uye${i + 1}@portfolio.demo`,
        status,
        source: MemberSource.DIRECT,
        memberGroupId: i % 5 === 0 ? fahriGroup.id : memberGroup.id,
        membershipInfoOptionId: pick(membershipOptions, i).id,
        registrationNumber,
        boardDecisionDate: approvedAt,
        boardDecisionBookNo: approvedAt ? `YK-${2024 + (i % 2)}-${100 + i}` : null,
        motherName: 'Anne',
        fatherName: 'Baba',
        birthDate: new Date(1975 + (i % 25), i % 12, 1 + (i % 28)),
        birthplace: pick(['Ankara', 'İstanbul', 'İzmir', 'Bursa', 'Antalya'], i),
        gender: i % 3 === 0 ? Gender.FEMALE : Gender.MALE,
        educationStatus: pick(
          [EducationStatus.COLLEGE, EducationStatus.HIGH_SCHOOL, EducationStatus.PRIMARY],
          i,
        ),
        institutionId: inst.id,
        provinceId: pid,
        districtId: district.id,
        tevkifatCenterId: tevkifatCenters[i % tevkifatCenters.length]?.id,
        tevkifatTitleId: tevkifatTitles[i % tevkifatTitles.length]?.id,
        branchId: branches[i % branches.length]?.id,
        professionId: professions[i % professions.length]?.id,
        dutyUnit: 'Sağlık Hizmetleri',
        institutionAddress: `${district.name} merkez`,
        createdByUserId: adminUser.id,
        approvedByUserId: approvedAt ? adminUser.id : null,
        approvedAt,
      },
    });

    if (status === MemberStatus.ACTIVE && registrationNumber) {
      activeMembers.push({ id: member.id, registrationNumber });
      await prisma.memberMembershipPeriod.create({
        data: {
          memberId: member.id,
          registrationNumber,
          periodStart: approvedAt!,
          status: MemberStatus.ACTIVE,
          approvedAt: approvedAt!,
          approvedByUserId: adminUser.id,
        },
      });
    }
  }

  const now = new Date();
  const paymentRows: Prisma.MemberPaymentCreateManyInput[] = [];
  for (let m = 0; m < activeMembers.length; m++) {
    const { id: memberId, registrationNumber: reg } = activeMembers[m];
    const monthsBack = 4 + (m % 5);
    for (let k = 0; k < monthsBack; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 15);
      paymentRows.push({
        memberId,
        registrationNumber: reg,
        paymentDate: d,
        paymentPeriodMonth: d.getMonth() + 1,
        paymentPeriodYear: d.getFullYear(),
        amount: new Prisma.Decimal(350 + (m % 7) * 25),
        paymentType: k % 3 === 0 ? PaymentType.TEVKIFAT : PaymentType.HAVALE,
        tevkifatCenterId: tevkifatCenters[m % tevkifatCenters.length]?.id,
        isApproved: k > 0 || m % 4 !== 0,
        approvedByUserId: k > 0 ? adminUser.id : null,
        approvedAt: k > 0 ? d : null,
        createdByUserId: adminUser.id,
        description: `Aidat ${d.getMonth() + 1}/${d.getFullYear()}`,
      });
    }
  }
  const BATCH = 500;
  for (let i = 0; i < paymentRows.length; i += BATCH) {
    await prisma.memberPayment.createMany({
      data: paymentRows.slice(i, i + BATCH),
    });
  }

  const advanceSlice = activeMembers.slice(0, 55);
  for (let i = 0; i < advanceSlice.length; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    await prisma.memberAdvance.create({
      data: {
        memberId: advanceSlice[i].id,
        registrationNumber: advanceSlice[i].registrationNumber,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        amount: new Prisma.Decimal(500 + i * 10),
        description: 'Avans ödemesi',
        createdByUserId: adminUser.id,
      },
    });
  }

  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getFullYear(), i % 12, 1);
    await prisma.invoice.create({
      data: {
        invoiceNo: `FTR-${now.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        recipient: pick(institutionNames, i),
        issueDate: d,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        amount: new Prisma.Decimal(12000 + i * 450),
        status: i % 4 === 0 ? InvoiceStatus.PAID : InvoiceStatus.SENT,
        description: 'Hizmet faturası',
        createdByUserId: adminUser.id,
      },
    });
  }

  const contentItems: { title: string; type: ContentType }[] = [
    { title: 'Yıllık Genel Kurul Duyurusu', type: ContentType.ANNOUNCEMENT },
    { title: 'Aidat Hatırlatması — Mayıs 2026', type: ContentType.ANNOUNCEMENT },
    { title: 'Yeni Üye Kabul Süreci', type: ContentType.NEWS },
    { title: 'Bölge Toplantısı Özeti', type: ContentType.NEWS },
    { title: 'Sağlık Çalışanları Hakları Semineri', type: ContentType.EVENT },
    { title: 'Tevkifat Merkezi Güncellemesi', type: ContentType.ANNOUNCEMENT },
  ];
  for (const item of contentItems) {
    await prisma.content.create({
      data: {
        title: item.title,
        content: `<p>${item.title} — portfolio demo içeriği.</p>`,
        type: item.type,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: adminUser.id,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'SITE_NAME' },
    create: {
      key: 'SITE_NAME',
      value: 'Portfolio — Sendika Yönetim Paneli',
      category: 'GENERAL',
      updatedBy: adminUser.id,
    },
    update: { value: 'Portfolio — Sendika Yönetim Paneli', updatedBy: adminUser.id },
  });

  console.log('📄 Doküman şablonları (seed5)...');
  await upsertDocumentTemplates(prisma);

  console.log('\n✅ Portfolio seed tamamlandı.');
  console.log(`   Üye: ${TOTAL} (${ACTIVE_COUNT} aktif, ${PENDING_COUNT} bekleyen)`);
  console.log(`   Ödeme kaydı: ${paymentRows.length}`);
  console.log(`   Admin giriş: ${adminEmail}`);
  console.log(`   Demo şifre (IK/Muhasebe): ${demoPassword}`);
  console.log(`   Otomatik giriş e-postası: ${adminEmail} (VITE_PORTFOLIO_DEMO_*)`);
}

main()
  .catch((e) => {
    console.error('❌ Portfolio seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
