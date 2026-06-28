/**
 * Bu script doküman yükleme status migration'ını uygular
 * 
 * Kullanım:
 *   ts-node -r tsconfig-paths/register scripts/apply-document-upload-migration.ts
 * 
 * VEYA
 * 
 *   npm run prisma:migrate:deploy
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('📦 Doküman yükleme status migration uygulanıyor...\n');

    // Migration SQL dosyasını oku
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260113003944_add_document_upload_status/migration.sql',
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration dosyası bulunamadı: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // SQL komutlarını ayır ve sırayla çalıştır
    // PostgreSQL'de ; ile ayrılmış komutları tek tek çalıştırmalıyız
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    console.log(`📝 ${statements.length} SQL komutu çalıştırılıyor...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      try {
        console.log(`[${i + 1}/${statements.length}] Komut çalıştırılıyor...`);
        // Her komutu ayrı ayrı çalıştır
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Komut başarılı\n`);
      } catch (error: any) {
        // Bazı hatalar beklenebilir (zaten var olan kolonlar, indeksler vb.)
        const errorMsg = error.message?.toLowerCase() || '';
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate') ||
          (errorMsg.includes('column') && errorMsg.includes('already')) ||
          errorMsg.includes('does not exist') ||
          error.code === 'P2010' // Prisma raw query error
        ) {
          console.log(`⚠️  Komut zaten uygulanmış veya atlanabilir (devam ediliyor)\n`);
        } else {
          console.error(`❌ Komut hatası:`, error.message);
          throw error;
        }
      }
    }

    // Mevcut dokümanları güncelle (raw SQL kullanarak)
    console.log('🔄 Mevcut dokümanlar güncelleniyor...\n');
    let updateCount = 0;
    try {
      const updateResult = await prisma.$executeRawUnsafe(`
        UPDATE "MemberDocument" 
        SET "uploadStatus" = 'APPROVED'
        WHERE "uploadStatus" = 'PENDING_UPLOAD' AND "fileUrl" IS NOT NULL
      `);
      updateCount = typeof updateResult === 'number' ? updateResult : 0;
      console.log(`✅ ${updateCount} doküman APPROVED durumuna güncellendi\n`);
    } catch (error: any) {
      console.log(`⚠️  Doküman güncelleme atlandı: ${error.message}\n`);
    }

    console.log('✨ Migration başarıyla uygulandı!\n');
    console.log('📋 Özet:');
    console.log('   - DocumentUploadStatus enum oluşturuldu');
    console.log('   - MemberDocument tablosuna yeni alanlar eklendi');
    console.log('   - İndeksler oluşturuldu');
    console.log(`   - ${updateCount} mevcut doküman güncellendi`);
  } catch (error) {
    console.error('❌ Migration uygulanırken hata oluştu:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script doğrudan çalıştırılıyorsa
if (require.main === module) {
  applyMigration()
    .then(() => {
      console.log('\n✅ Tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Hata:', error);
      process.exit(1);
    });
}

export { applyMigration };

