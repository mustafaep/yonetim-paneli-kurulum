-- AlterTable
ALTER TABLE IF EXISTS "Branch" DROP CONSTRAINT IF EXISTS "Branch_provinceId_fkey";
ALTER TABLE IF EXISTS "Branch" DROP CONSTRAINT IF EXISTS "Branch_districtId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Branch_provinceId_idx";
DROP INDEX IF EXISTS "Branch_districtId_idx";

-- AlterTable
ALTER TABLE IF EXISTS "Branch" DROP COLUMN IF EXISTS "provinceId";
ALTER TABLE IF EXISTS "Branch" DROP COLUMN IF EXISTS "districtId";

