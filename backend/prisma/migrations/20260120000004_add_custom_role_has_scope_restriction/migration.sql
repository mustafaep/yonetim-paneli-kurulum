-- Add hasScopeRestriction column to CustomRole table
-- This column was supposed to be added in 20250120000000 but that migration ran before CustomRole table was created
-- This migration ensures the column exists

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'CustomRole' 
        AND column_name = 'hasScopeRestriction'
    ) THEN
        ALTER TABLE "CustomRole" 
        ADD COLUMN "hasScopeRestriction" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;














