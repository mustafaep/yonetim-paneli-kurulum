-- Fix TevkifatCenter schema drift:
-- Older DBs may have TevkifatCenter without provinceId/districtId columns, while Prisma schema expects them.
-- This migration is idempotent and safe.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'TevkifatCenter'
  ) THEN
    -- Add columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TevkifatCenter' AND column_name = 'provinceId'
    ) THEN
      ALTER TABLE "TevkifatCenter" ADD COLUMN "provinceId" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'TevkifatCenter' AND column_name = 'districtId'
    ) THEN
      ALTER TABLE "TevkifatCenter" ADD COLUMN "districtId" TEXT;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS "TevkifatCenter_provinceId_idx" ON "TevkifatCenter"("provinceId");
    CREATE INDEX IF NOT EXISTS "TevkifatCenter_districtId_idx" ON "TevkifatCenter"("districtId");

    -- Foreign keys (idempotent)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'TevkifatCenter_provinceId_fkey'
    ) THEN
      ALTER TABLE "TevkifatCenter"
        ADD CONSTRAINT "TevkifatCenter_provinceId_fkey"
        FOREIGN KEY ("provinceId") REFERENCES "Province"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'TevkifatCenter_districtId_fkey'
    ) THEN
      ALTER TABLE "TevkifatCenter"
        ADD CONSTRAINT "TevkifatCenter_districtId_fkey"
        FOREIGN KEY ("districtId") REFERENCES "District"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;




























