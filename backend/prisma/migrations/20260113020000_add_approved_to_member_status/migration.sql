-- Add APPROVED value to MemberStatus enum
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
-- This migration should be run manually if APPROVED doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'APPROVED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MemberStatus')
    ) THEN
        ALTER TYPE "MemberStatus" ADD VALUE 'APPROVED';
    END IF;
END $$;

