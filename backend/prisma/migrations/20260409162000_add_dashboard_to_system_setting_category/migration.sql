-- Add DASHBOARD category to SystemSettingCategory enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemSettingCategory') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'DASHBOARD'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'DASHBOARD';
    END IF;
  END IF;
END $$;
