-- AlterTable
-- NOTE:
-- Migration ordering in this repo has older (2025-01) migrations that touch "Member",
-- while "Member" itself is created later (2025-12). On a fresh database this would fail.
-- To keep `prisma migrate deploy` working for new installs, we guard this ALTER TABLE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Member'
  ) THEN
    ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
  END IF;
END $$;

