-- AlterTable
ALTER TABLE "TevkifatFile" ADD COLUMN IF NOT EXISTS "tevkifatTitleId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TevkifatFile_tevkifatTitleId_idx" ON "TevkifatFile"("tevkifatTitleId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TevkifatFile_tevkifatTitleId_fkey'
  ) THEN
    ALTER TABLE "TevkifatFile" ADD CONSTRAINT "TevkifatFile_tevkifatTitleId_fkey"
      FOREIGN KEY ("tevkifatTitleId") REFERENCES "TevkifatTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
