-- AlterTable
ALTER TABLE IF EXISTS "TevkifatCenter" ADD COLUMN IF NOT EXISTS "provinceId" TEXT;
ALTER TABLE IF EXISTS "TevkifatCenter" ADD COLUMN IF NOT EXISTS "districtId" TEXT;

-- CreateIndex
DO $$
BEGIN
  IF to_regclass('"TevkifatCenter"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "TevkifatCenter_provinceId_idx" ON "TevkifatCenter"("provinceId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "TevkifatCenter_districtId_idx" ON "TevkifatCenter"("districtId")';
  END IF;
END $$;

-- AddForeignKey (IF NOT EXISTS constraint için DO block kullanıyoruz)
DO $$
BEGIN
    IF to_regclass('"TevkifatCenter"') IS NULL THEN
      RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TevkifatCenter_provinceId_fkey'
    ) THEN
        IF to_regclass('"Province"') IS NOT NULL THEN
          ALTER TABLE "TevkifatCenter" ADD CONSTRAINT "TevkifatCenter_provinceId_fkey" 
          FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TevkifatCenter_districtId_fkey'
    ) THEN
        IF to_regclass('"District"') IS NOT NULL THEN
          ALTER TABLE "TevkifatCenter" ADD CONSTRAINT "TevkifatCenter_districtId_fkey" 
          FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

