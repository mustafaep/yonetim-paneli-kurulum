/*
  Warnings:

  - You are about to drop the column `dealerId` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `membershipInfo` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `workplaceId` on the `Member` table. All the data in the column will be lost.
  - Made the column `nationalId` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `institutionId` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `positionTitle` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `registrationNumber` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workingDistrictId` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `workingProvinceId` on table `Member` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_dealerId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_workingDistrictId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_workingProvinceId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_workplaceId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Member_registrationNumber_idx";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "dealerId",
DROP COLUMN "membershipInfo",
DROP COLUMN "workplaceId",
ADD COLUMN     "membershipInfoOptionId" TEXT,
ALTER COLUMN "nationalId" SET NOT NULL,
ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "institutionId" SET NOT NULL,
ALTER COLUMN "positionTitle" SET NOT NULL,
ALTER COLUMN "registrationNumber" SET NOT NULL,
ALTER COLUMN "workingDistrictId" SET NOT NULL,
ALTER COLUMN "workingProvinceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Member_status_idx" ON "Member"("status");

-- AddForeignKey (IF NOT EXISTS constraint için DO block kullanıyoruz)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_membershipInfoOptionId_fkey'
    ) THEN
        ALTER TABLE "Member" ADD CONSTRAINT "Member_membershipInfoOptionId_fkey" 
        FOREIGN KEY ("membershipInfoOptionId") REFERENCES "MembershipInfoOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_workingProvinceId_fkey'
    ) THEN
        ALTER TABLE "Member" ADD CONSTRAINT "Member_workingProvinceId_fkey" 
        FOREIGN KEY ("workingProvinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_workingDistrictId_fkey'
    ) THEN
        ALTER TABLE "Member" ADD CONSTRAINT "Member_workingDistrictId_fkey" 
        FOREIGN KEY ("workingDistrictId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_institutionId_fkey'
    ) THEN
        ALTER TABLE "Member" ADD CONSTRAINT "Member_institutionId_fkey" 
        FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_branchId_fkey'
    ) THEN
        ALTER TABLE "Member" ADD CONSTRAINT "Member_branchId_fkey" 
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
