-- AlterTable: Remove workingProvinceId, workingDistrictId, positionTitle, institutionRegNo, workUnit, workUnitAddress from Member
ALTER TABLE IF EXISTS "Member" DROP COLUMN IF EXISTS "workingProvinceId";
ALTER TABLE IF EXISTS "Member" DROP COLUMN IF EXISTS "workingDistrictId";
ALTER TABLE IF EXISTS "Member" DROP COLUMN IF EXISTS "positionTitle";
ALTER TABLE IF EXISTS "Member" DROP COLUMN IF EXISTS "institutionRegNo";
ALTER TABLE IF EXISTS "Member" DROP COLUMN IF EXISTS "workUnit";
ALTER TABLE IF EXISTS "Member" DROP COLUMN IF EXISTS "workUnitAddress";

