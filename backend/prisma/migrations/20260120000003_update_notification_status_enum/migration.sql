-- Update NotificationStatus enum to include SENDING and PARTIALLY_SENT
-- This migration adds missing enum values that exist in the schema

DO $$
BEGIN
    -- Add SENDING if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'NotificationStatus' AND e.enumlabel = 'SENDING'
    ) THEN
        ALTER TYPE "NotificationStatus" ADD VALUE 'SENDING';
    END IF;

    -- Add PARTIALLY_SENT if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'NotificationStatus' AND e.enumlabel = 'PARTIALLY_SENT'
    ) THEN
        ALTER TYPE "NotificationStatus" ADD VALUE 'PARTIALLY_SENT';
    END IF;
END $$;

