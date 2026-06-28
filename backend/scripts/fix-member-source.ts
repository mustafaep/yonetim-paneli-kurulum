import { PrismaClient } from '@prisma/client';

// Prisma automatically loads .env from project root
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating MemberSource enum and data...');
  
  // First, add the new enum value (this requires raw SQL)
  await prisma.$executeRawUnsafe(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CONTRACTED_INSTITUTION' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MemberSource')
      ) THEN
        ALTER TYPE "MemberSource" ADD VALUE 'CONTRACTED_INSTITUTION';
      END IF;
    END $$;
  `);
  
  console.log('✅ Enum value added');
  
  // Update existing data
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "Member" 
    SET "source" = 'CONTRACTED_INSTITUTION'::"MemberSource" 
    WHERE "source" = 'DEALER'::"MemberSource"
  `);
  
  console.log(`✅ Updated ${result} member(s) from DEALER to CONTRACTED_INSTITUTION`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

