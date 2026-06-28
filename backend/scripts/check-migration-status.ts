/**
 * Migration durumunu kontrol et
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    console.log('🔍 Migration durumu kontrol ediliyor...\n');

    // Kolonları kontrol et
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'MemberDocument'
      AND column_name IN ('uploadStatus', 'secureFileName', 'reviewedBy', 'stagingPath', 'permanentPath')
      ORDER BY column_name;
    `);

    console.log('📋 Mevcut kolonlar:');
    console.log(columns);
    console.log('');

    // Enum'u kontrol et
    const enumExists = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM pg_type WHERE typname = 'DocumentUploadStatus';
    `);

    console.log('📋 DocumentUploadStatus enum:', enumExists && Array.isArray(enumExists) && enumExists.length > 0 ? '✅ Var' : '❌ Yok');
    console.log('');

    // Foreign key'i kontrol et
    const fkExists = await prisma.$queryRawUnsafe(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'MemberDocument'
      AND constraint_name = 'MemberDocument_reviewedBy_fkey';
    `);

    console.log('📋 Foreign key:', fkExists && Array.isArray(fkExists) && fkExists.length > 0 ? '✅ Var' : '❌ Yok');
    console.log('');

    // İndeksleri kontrol et
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'MemberDocument'
      AND indexname IN ('MemberDocument_uploadStatus_idx', 'MemberDocument_reviewedBy_idx');
    `);

    console.log('📋 İndeksler:');
    console.log(indexes);
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();

