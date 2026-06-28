-- AlterTable
ALTER TABLE "MemberDocument" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MemberPayment" ADD COLUMN "deletedAt" TIMESTAMP(3);

