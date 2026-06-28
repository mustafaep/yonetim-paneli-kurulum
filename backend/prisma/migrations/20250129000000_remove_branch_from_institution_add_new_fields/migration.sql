-- AlterTable
-- Önce foreign key constraint'i kaldır (eğer varsa)
DO $$ 
BEGIN
  IF to_regclass('"Institution"') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Institution_branchId_fkey'
  ) THEN
    ALTER TABLE "Institution" DROP CONSTRAINT "Institution_branchId_fkey";
  END IF;
END $$;

-- Index'i kaldır (eğer varsa)
DROP INDEX IF EXISTS "Institution_branchId_idx";

-- branchId kolonunu kaldır (eğer varsa)
DO $$ 
BEGIN
  IF to_regclass('"Institution"') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Institution' AND column_name = 'branchId'
  ) THEN
    ALTER TABLE "Institution" DROP COLUMN "branchId";
  END IF;
END $$;

-- Yeni kolonları ekle (eğer yoksa)
DO $$ 
BEGIN
  IF to_regclass('"Institution"') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Institution' AND column_name = 'kurumSicilNo'
  ) THEN
    ALTER TABLE "Institution" ADD COLUMN "kurumSicilNo" TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Institution' AND column_name = 'gorevBirimi'
  ) THEN
    ALTER TABLE "Institution" ADD COLUMN "gorevBirimi" TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Institution' AND column_name = 'kurumAdresi'
  ) THEN
    ALTER TABLE "Institution" ADD COLUMN "kurumAdresi" TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Institution' AND column_name = 'kadroUnvanKodu'
  ) THEN
    ALTER TABLE "Institution" ADD COLUMN "kadroUnvanKodu" TEXT;
  END IF;
END $$;

