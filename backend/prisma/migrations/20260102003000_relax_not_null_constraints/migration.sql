-- This migration aligns older DB constraints with the current Prisma schema + seed expectations.
-- Several tables were created with NOT NULL columns (e.g. Branch.provinceId) while the Prisma
-- schema treats them as optional, and the seed inserts NULL for "central" records.
--
-- We relax NOT NULL constraints in a safe, idempotent way.

DO $$
BEGIN
  -- Branch.provinceId: allow NULL (central branches)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Branch' AND column_name = 'provinceId'
  ) THEN
    EXECUTE 'ALTER TABLE "Branch" ALTER COLUMN "provinceId" DROP NOT NULL';
  END IF;

  -- Institution.provinceId: allow NULL (central institutions)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Institution' AND column_name = 'provinceId'
  ) THEN
    EXECUTE 'ALTER TABLE "Institution" ALTER COLUMN "provinceId" DROP NOT NULL';
  END IF;

  -- Institution.branchId: older schema required this; current Prisma schema does not.
  -- Allow NULL so Prisma inserts without providing branchId.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Institution' AND column_name = 'branchId'
  ) THEN
    EXECUTE 'ALTER TABLE "Institution" ALTER COLUMN "branchId" DROP NOT NULL';
  END IF;

  -- SystemLog.userId: Prisma schema allows NULL (e.g. failed login events)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SystemLog' AND column_name = 'userId'
  ) THEN
    EXECUTE 'ALTER TABLE "SystemLog" ALTER COLUMN "userId" DROP NOT NULL';
  END IF;
END $$;


