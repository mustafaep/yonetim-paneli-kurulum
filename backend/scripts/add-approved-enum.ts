import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding APPROVED value to MemberStatus enum...');
  
  try {
    // Check if APPROVED already exists
    const enumCheck = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumlabel = 'APPROVED' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MemberStatus')
    `;

    if (enumCheck.length > 0) {
      console.log('APPROVED value already exists in MemberStatus enum.');
      return;
    }

    // Add APPROVED value to enum
    await prisma.$executeRaw`
      ALTER TYPE "MemberStatus" ADD VALUE 'APPROVED'
    `;

    console.log('✅ Successfully added APPROVED value to MemberStatus enum.');
  } catch (error) {
    console.error('❌ Error adding APPROVED value:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

