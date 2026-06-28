-- DropForeignKey
ALTER TABLE "TevkifatCenter" DROP CONSTRAINT IF EXISTS "TevkifatCenter_provinceId_fkey";
ALTER TABLE "TevkifatCenter" DROP CONSTRAINT IF EXISTS "TevkifatCenter_districtId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "TevkifatCenter_provinceId_idx";
DROP INDEX IF EXISTS "TevkifatCenter_districtId_idx";

-- AlterTable
ALTER TABLE "TevkifatCenter" DROP COLUMN IF EXISTS "provinceId";
ALTER TABLE "TevkifatCenter" DROP COLUMN IF EXISTS "districtId";

