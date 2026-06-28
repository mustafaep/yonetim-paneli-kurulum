-- Ensure AUDIT exists on SystemSettingCategory enum (fresh installs / drift fixes)
-- This is intentionally placed after the enum is guaranteed to exist in later migrations.

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemSettingCategory') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'AUDIT'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'AUDIT';
    END IF;
  END IF;
END $$;




























