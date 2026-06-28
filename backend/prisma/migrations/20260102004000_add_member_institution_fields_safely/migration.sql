-- Align DB with current Prisma schema for Member institution-related fields.
-- In this repo, some older migrations that add these columns may be skipped/resolved during fresh installs.
-- This migration is idempotent and safe to run multiple times.

-- Add missing columns on Member (if needed)
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "dutyUnit" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "institutionAddress" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "institutionProvinceId" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "institutionDistrictId" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "professionId" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "institutionRegNo" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "staffTitleCode" TEXT;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "Member_professionId_idx" ON "Member"("professionId");
CREATE INDEX IF NOT EXISTS "Member_institutionProvinceId_idx" ON "Member"("institutionProvinceId");
CREATE INDEX IF NOT EXISTS "Member_institutionDistrictId_idx" ON "Member"("institutionDistrictId");

-- Foreign keys (idempotent via pg_constraint checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Member_professionId_fkey'
  ) THEN
    ALTER TABLE "Member"
      ADD CONSTRAINT "Member_professionId_fkey"
      FOREIGN KEY ("professionId") REFERENCES "Profession"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Member_institutionProvinceId_fkey'
  ) THEN
    ALTER TABLE "Member"
      ADD CONSTRAINT "Member_institutionProvinceId_fkey"
      FOREIGN KEY ("institutionProvinceId") REFERENCES "Province"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Member_institutionDistrictId_fkey'
  ) THEN
    ALTER TABLE "Member"
      ADD CONSTRAINT "Member_institutionDistrictId_fkey"
      FOREIGN KEY ("institutionDistrictId") REFERENCES "District"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


