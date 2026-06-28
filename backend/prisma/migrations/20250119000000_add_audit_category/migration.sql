-- Migration: Add AUDIT category to SystemSettingCategory enum
-- This migration adds the AUDIT category to the SystemSettingCategory enum

-- Add AUDIT value to SystemSettingCategory enum if it doesn't exist
-- Önce enum'un var olup olmadığını kontrol et
DO $$ 
BEGIN
  -- SystemSettingCategory enum'unun var olup olmadığını kontrol et
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemSettingCategory') THEN
    -- AUDIT değerinin var olup olmadığını kontrol et
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'AUDIT' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SystemSettingCategory')
    ) THEN
      ALTER TYPE "SystemSettingCategory" ADD VALUE 'AUDIT';
    END IF;
  END IF;
  -- Eğer enum yoksa, migration sessizce geçer (enum daha sonraki migration'da oluşturulacak)
END $$;

