-- AlterTable
-- NOTE:
-- This repo has older migrations (2025-01) that may run before the table is created (2025-12).
-- Guard to avoid failing on fresh databases where "TevkifatCenter" doesn't exist yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'TevkifatCenter'
  ) THEN
    ALTER TABLE "TevkifatCenter" ADD COLUMN IF NOT EXISTS "title" TEXT;
  END IF;
END $$;

