/**
 * Mustafa portfolio DB — admin e-posta/şifre güncelle (MKÜ'ye dokunmaz).
 *
 *   docker compose -f docker-compose.yml -f docker-compose.mustafa.yml --env-file .env.mustafa \
 *     exec backend npx ts-node -r tsconfig-paths/register prisma/reset-portfolio-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL ve ADMIN_PASSWORD gerekli (.env.mustafa).');
  }

  const dbHint = `${process.env.POSTGRES_DB || ''} ${process.env.DATABASE_URL || ''}`.toLowerCase();
  if (
    dbHint.includes('yonetim_paneli') &&
    !dbHint.includes('mustafa') &&
    !dbHint.includes('portfolio')
  ) {
    throw new Error('MKÜ veritabanı riski — mustafa backend container ile çalıştırın.');
  }

  const adminRole = await prisma.customRole.findFirst({
    where: { name: 'ADMIN', isActive: true },
  });
  if (!adminRole) {
    throw new Error('ADMIN rolü yok. Önce seed-portfolio-mustafa çalıştırın.');
  }

  const hash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: hash,
        isActive: true,
        deletedAt: null,
        customRoles: { set: [{ id: adminRole.id }] },
      },
    });
    console.log(`✅ Şifre güncellendi: ${email}`);
  } else {
    const others = await prisma.user.findMany({
      select: { email: true },
      take: 10,
    });
    console.log('Mevcut kullanıcılar:', others.map((u) => u.email).join(', ') || '(yok)');

    await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        firstName: 'Admin',
        lastName: 'User',
        customRoles: { connect: { id: adminRole.id } },
      },
    });
    console.log(`✅ Admin oluşturuldu: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
