/*
  Warnings:

  - You are about to alter the column `amount` on the `DuesPlan` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "DuesPlan" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "duesPlanId" TEXT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_duesPlanId_fkey" FOREIGN KEY ("duesPlanId") REFERENCES "DuesPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
