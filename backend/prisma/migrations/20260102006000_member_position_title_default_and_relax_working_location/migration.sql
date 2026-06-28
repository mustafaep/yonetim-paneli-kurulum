-- Fix for schema/migration drift:
-- - Some DBs have Member.positionTitle as NOT NULL, but current Prisma schema may not include the field.
--   If Prisma omits the column, Postgres will insert NULL unless a DEFAULT exists -> seed/runtime fails.
-- - Some DBs may have workingProvinceId/workingDistrictId set to NOT NULL while Prisma schema/seed omit them.
--
-- This migration is idempotent and safe for fresh and existing databases.

DO $$
BEGIN
  -- Ensure a DEFAULT for Member.positionTitle if the column exists.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member' AND column_name = 'positionTitle'
  ) THEN
    -- Backfill existing NULLs (if any)
    EXECUTE 'UPDATE "Member" SET "positionTitle" = ''KADRO_657''::"PositionTitle" WHERE "positionTitle" IS NULL';
    -- Set default so inserts that omit the column succeed even if it is NOT NULL
    EXECUTE 'ALTER TABLE "Member" ALTER COLUMN "positionTitle" SET DEFAULT ''KADRO_657''::"PositionTitle"';
  END IF;

  -- Relax NOT NULL constraints for legacy working location columns (if present)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member' AND column_name = 'workingProvinceId'
  ) THEN
    EXECUTE 'ALTER TABLE "Member" ALTER COLUMN "workingProvinceId" DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member' AND column_name = 'workingDistrictId'
  ) THEN
    EXECUTE 'ALTER TABLE "Member" ALTER COLUMN "workingDistrictId" DROP NOT NULL';
  END IF;
END $$;


