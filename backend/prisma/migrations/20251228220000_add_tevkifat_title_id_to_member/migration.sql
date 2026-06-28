-- AlterTable
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "tevkifatTitleId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Member_tevkifatTitleId_idx" ON "Member"("tevkifatTitleId");

-- AddForeignKey (IF NOT EXISTS constraint için DO block kullanıyoruz)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_tevkifatTitleId_fkey'
    ) THEN
        ALTER TABLE "Member" ADD CONSTRAINT "Member_tevkifatTitleId_fkey" 
        FOREIGN KEY ("tevkifatTitleId") REFERENCES "TevkifatTitle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
