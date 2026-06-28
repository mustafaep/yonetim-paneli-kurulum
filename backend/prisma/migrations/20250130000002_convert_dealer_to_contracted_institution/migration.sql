-- Convert Dealer table to ContractedInstitution
-- Step 1: Check if Dealer table exists, if not skip (table might already be renamed)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Dealer') THEN
    -- Rename the table
    ALTER TABLE "Dealer" RENAME TO "ContractedInstitution";
  END IF;
END $$;

-- Step 2: Update UserScope table foreign key (if dealerId column exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'UserScope' AND column_name = 'dealerId') THEN
    ALTER TABLE "UserScope" DROP CONSTRAINT IF EXISTS "UserScope_dealerId_fkey";
    ALTER TABLE "UserScope" RENAME COLUMN "dealerId" TO "contractedInstitutionId";
    ALTER TABLE "UserScope" ADD CONSTRAINT "UserScope_contractedInstitutionId_fkey" 
      FOREIGN KEY ("contractedInstitutionId") REFERENCES "ContractedInstitution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 3: Update foreign key constraints in ContractedInstitution table (if they exist)
DO $$
BEGIN
  -- Update Province foreign key
  IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND table_name = 'ContractedInstitution' AND constraint_name LIKE '%province%') THEN
    -- Constraint already exists with correct name after table rename
    NULL;
  END IF;
  
  -- Update District foreign key
  IF EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND table_name = 'ContractedInstitution' AND constraint_name LIKE '%district%') THEN
    -- Constraint already exists with correct name after table rename
    NULL;
  END IF;
END $$;

-- Note: Role enum (BAYI_YETKILISI -> ANLASMALI_KURUM_YETKILISI) cannot be renamed in PostgreSQL
-- The application code handles this mapping

