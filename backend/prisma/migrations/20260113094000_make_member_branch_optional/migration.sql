-- Make Member.branchId optional so that branch can be left empty on member application.
-- We also drop the foreign key constraint to avoid failures when branchId is not set.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Member'
      AND column_name = 'branchId'
  ) THEN
    -- Drop FK constraint if it exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'Member'
        AND constraint_name = 'Member_branchId_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE "Member" DROP CONSTRAINT "Member_branchId_fkey"';
    END IF;

    -- Relax NOT NULL constraint
    EXECUTE 'ALTER TABLE "Member" ALTER COLUMN "branchId" DROP NOT NULL';
  END IF;
END $$;



