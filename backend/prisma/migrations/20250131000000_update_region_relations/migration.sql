-- AlterTable: Institution - Make provinceId nullable and update foreign key constraint names
ALTER TABLE IF EXISTS "Institution" ALTER COLUMN "provinceId" DROP NOT NULL;

-- Drop existing foreign key constraints for Institution
ALTER TABLE IF EXISTS "Institution" DROP CONSTRAINT IF EXISTS "Institution_provinceId_fkey";
ALTER TABLE IF EXISTS "Institution" DROP CONSTRAINT IF EXISTS "Institution_districtId_fkey";

-- Add new foreign key constraints with updated relation names
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Institution_provinceId_fkey'
    ) THEN
        IF to_regclass('"Institution"') IS NOT NULL AND to_regclass('"Province"') IS NOT NULL THEN
          ALTER TABLE "Institution" ADD CONSTRAINT "Institution_provinceId_fkey" 
          FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Institution_districtId_fkey'
    ) THEN
        IF to_regclass('"Institution"') IS NOT NULL AND to_regclass('"District"') IS NOT NULL THEN
          ALTER TABLE "Institution" ADD CONSTRAINT "Institution_districtId_fkey" 
          FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AlterTable: Branch - Add provinceId and districtId columns
ALTER TABLE IF EXISTS "Branch" ADD COLUMN IF NOT EXISTS "provinceId" TEXT;
ALTER TABLE IF EXISTS "Branch" ADD COLUMN IF NOT EXISTS "districtId" TEXT;

-- CreateIndex: Branch - Add indexes for provinceId and districtId
DO $$
BEGIN
  IF to_regclass('"Branch"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Branch_provinceId_idx" ON "Branch"("provinceId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Branch_districtId_idx" ON "Branch"("districtId")';
  END IF;
END $$;

-- AddForeignKey: Branch - Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Branch_provinceId_fkey'
    ) THEN
        IF to_regclass('"Branch"') IS NOT NULL AND to_regclass('"Province"') IS NOT NULL THEN
          ALTER TABLE "Branch" ADD CONSTRAINT "Branch_provinceId_fkey" 
          FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Branch_districtId_fkey'
    ) THEN
        IF to_regclass('"Branch"') IS NOT NULL AND to_regclass('"District"') IS NOT NULL THEN
          ALTER TABLE "Branch" ADD CONSTRAINT "Branch_districtId_fkey" 
          FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- AlterTable: TevkifatCenter - Update foreign key constraint names
ALTER TABLE IF EXISTS "TevkifatCenter" DROP CONSTRAINT IF EXISTS "TevkifatCenter_provinceId_fkey";
ALTER TABLE IF EXISTS "TevkifatCenter" DROP CONSTRAINT IF EXISTS "TevkifatCenter_districtId_fkey";

-- AddForeignKey: TevkifatCenter - Add foreign key constraints with updated relation names
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TevkifatCenter_provinceId_fkey'
    ) THEN
        IF to_regclass('"TevkifatCenter"') IS NOT NULL AND to_regclass('"Province"') IS NOT NULL THEN
          ALTER TABLE "TevkifatCenter" ADD CONSTRAINT "TevkifatCenter_provinceId_fkey" 
          FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TevkifatCenter_districtId_fkey'
    ) THEN
        IF to_regclass('"TevkifatCenter"') IS NOT NULL AND to_regclass('"District"') IS NOT NULL THEN
          ALTER TABLE "TevkifatCenter" ADD CONSTRAINT "TevkifatCenter_districtId_fkey" 
          FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

