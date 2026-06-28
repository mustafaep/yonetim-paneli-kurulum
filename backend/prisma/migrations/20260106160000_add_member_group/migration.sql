-- CreateTable
CREATE TABLE IF NOT EXISTS "MemberGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MemberGroup_name_key" ON "MemberGroup"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberGroup_isActive_idx" ON "MemberGroup"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberGroup_order_idx" ON "MemberGroup"("order");

-- AlterTable
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "memberGroupId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Member_memberGroupId_idx" ON "Member"("memberGroupId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_memberGroupId_fkey'
    ) THEN
        ALTER TABLE "Member" 
        ADD CONSTRAINT "Member_memberGroupId_fkey" 
        FOREIGN KEY ("memberGroupId") 
        REFERENCES "MemberGroup"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;























