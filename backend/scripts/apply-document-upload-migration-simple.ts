/**
 * Basit migration script - SQL komutlarını doğrudan çalıştırır
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('📦 Doküman yükleme status migration uygulanıyor...\n');

    // 1. Enum oluştur
    console.log('1️⃣ DocumentUploadStatus enum oluşturuluyor...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDING_UPLOAD', 'STAGING', 'APPROVED', 'REJECTED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✅ Enum oluşturuldu\n');
    } catch (error: any) {
      console.log('⚠️  Enum zaten var veya hata: ' + error.message + '\n');
    }

    // 2. Kolonları ekle (her birini ayrı ayrı kontrol ederek)
    console.log('2️⃣ Yeni kolonlar ekleniyor...');
    
    const addColumnIfNotExists = async (columnName: string, columnDef: string) => {
      try {
        // Önce kolonun var olup olmadığını kontrol et
        const exists = await prisma.$queryRawUnsafe(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'MemberDocument' 
          AND column_name = '${columnName}';
        `);
        
        if (!exists || (Array.isArray(exists) && exists.length === 0)) {
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "MemberDocument" 
            ADD COLUMN "${columnName}" ${columnDef};
          `);
          console.log(`   ✅ ${columnName} eklendi`);
          return true;
        } else {
          console.log(`   ⚠️  ${columnName} zaten var`);
          return false;
        }
      } catch (error: any) {
        console.log(`   ❌ ${columnName} eklenirken hata: ${error.message}`);
        return false;
      }
    };

    await addColumnIfNotExists('secureFileName', 'TEXT');
    await addColumnIfNotExists('fileSize', 'INTEGER');
    await addColumnIfNotExists('mimeType', 'TEXT');
    await addColumnIfNotExists('uploadStatus', '"DocumentUploadStatus" NOT NULL DEFAULT \'PENDING_UPLOAD\'');
    await addColumnIfNotExists('stagingPath', 'TEXT');
    await addColumnIfNotExists('permanentPath', 'TEXT');
    await addColumnIfNotExists('reviewedBy', 'TEXT');
    await addColumnIfNotExists('reviewedAt', 'TIMESTAMP(3)');
    await addColumnIfNotExists('adminNote', 'TEXT');
    await addColumnIfNotExists('rejectionReason', 'TEXT');
    await addColumnIfNotExists('updatedAt', 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    console.log('');

    // 3. fileUrl'i nullable yap
    console.log('3️⃣ fileUrl nullable yapılıyor...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "MemberDocument" 
        ALTER COLUMN "fileUrl" DROP NOT NULL;
      `);
      console.log('✅ fileUrl nullable yapıldı\n');
    } catch (error: any) {
      console.log('⚠️  fileUrl zaten nullable veya hata: ' + error.message + '\n');
    }

    // 4. Foreign key ekle (kolonlar eklendikten sonra)
    console.log('4️⃣ Foreign key ekleniyor...');
    try {
      // Önce constraint'in var olup olmadığını kontrol et
      const constraintExists = await prisma.$queryRawUnsafe(`
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MemberDocument_reviewedBy_fkey' 
        AND table_name = 'MemberDocument';
      `);
      
      if (!constraintExists || (Array.isArray(constraintExists) && constraintExists.length === 0)) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "MemberDocument" 
          ADD CONSTRAINT "MemberDocument_reviewedBy_fkey" 
          FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
        console.log('✅ Foreign key eklendi\n');
      } else {
        console.log('⚠️  Foreign key zaten var\n');
      }
    } catch (error: any) {
      console.log('⚠️  Foreign key hatası: ' + error.message + '\n');
    }

    // 5. İndeksler oluştur
    console.log('5️⃣ İndeksler oluşturuluyor...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MemberDocument_uploadStatus_idx" ON "MemberDocument"("uploadStatus");
      `);
      console.log('   ✅ uploadStatus indeksi oluşturuldu');
    } catch (error: any) {
      console.log('   ⚠️  uploadStatus indeksi zaten var');
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MemberDocument_reviewedBy_idx" ON "MemberDocument"("reviewedBy");
      `);
      console.log('   ✅ reviewedBy indeksi oluşturuldu\n');
    } catch (error: any) {
      console.log('   ⚠️  reviewedBy indeksi zaten var\n');
    }

    // 6. Mevcut dokümanları güncelle (Prisma client ile)
    console.log('6️⃣ Mevcut dokümanlar güncelleniyor...');
    try {
      // Önce kolonun var olup olmadığını kontrol et
      const columnExists = await prisma.$queryRawUnsafe(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'MemberDocument' 
        AND column_name = 'uploadStatus';
      `);
      
      if (columnExists && Array.isArray(columnExists) && columnExists.length > 0) {
        const result = await prisma.memberDocument.updateMany({
          where: {
            uploadStatus: 'PENDING_UPLOAD',
            fileUrl: { not: null },
          },
          data: {
            uploadStatus: 'APPROVED',
          },
        });
        console.log(`✅ ${result.count} doküman APPROVED durumuna güncellendi\n`);
      } else {
        console.log('⚠️  uploadStatus kolonu henüz oluşturulmamış\n');
      }
    } catch (error: any) {
      console.log('⚠️  Doküman güncelleme hatası: ' + error.message + '\n');
    }

    console.log('✨ Migration başarıyla tamamlandı!\n');
  } catch (error) {
    console.error('❌ Migration uygulanırken hata oluştu:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('✅ Tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Hata:', error);
    process.exit(1);
  });

