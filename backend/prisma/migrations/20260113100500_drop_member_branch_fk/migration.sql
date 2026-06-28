-- Explicitly drop Member_branchId_fkey for existing databases.
-- Editing older migrations does NOT affect already-deployed DBs,
-- so we add this separate migration to clean up the foreign key.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'Member'
      AND constraint_name = 'Member_branchId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "Member" DROP CONSTRAINT "Member_branchId_fkey"';
  END IF;
END $$;



