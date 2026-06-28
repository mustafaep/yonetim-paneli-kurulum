-- AlterEnum
-- This migration adds new categories to SystemSettingCategory enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

-- PostgreSQL'de IF NOT EXISTS desteklenmediği için DO bloğu kullanıyoruz
DO $$ 
BEGIN
  -- SystemSettingCategory enum'unun var olup olmadığını kontrol et
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemSettingCategory') THEN
    -- MEMBERSHIP değerini ekle
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'MEMBERSHIP' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'MEMBERSHIP';
    END IF;
    
    -- DUES değerini ekle
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'DUES' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'DUES';
    END IF;
    
    -- SECURITY değerini ekle
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'SECURITY' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'SECURITY';
    END IF;
    
    -- NOTIFICATION değerini ekle
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'NOTIFICATION' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'NOTIFICATION';
    END IF;
    
    -- UI değerini ekle
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'UI' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'UI';
    END IF;
  END IF;
END $$;

