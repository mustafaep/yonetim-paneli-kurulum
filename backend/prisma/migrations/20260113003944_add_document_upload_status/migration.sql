-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDING_UPLOAD', 'STAGING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add new columns
ALTER TABLE "MemberDocument" 
ADD COLUMN IF NOT EXISTS "secureFileName" TEXT,
ADD COLUMN IF NOT EXISTS "fileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
ADD COLUMN IF NOT EXISTS "uploadStatus" "DocumentUploadStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
ADD COLUMN IF NOT EXISTS "stagingPath" TEXT,
ADD COLUMN IF NOT EXISTS "permanentPath" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make fileUrl nullable (it will be null for staging documents)
DO $$ 
BEGIN
    ALTER TABLE "MemberDocument" ALTER COLUMN "fileUrl" DROP NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    ALTER TABLE "MemberDocument" 
    ADD CONSTRAINT "MemberDocument_reviewedBy_fkey" 
    FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberDocument_uploadStatus_idx" ON "MemberDocument"("uploadStatus");
CREATE INDEX IF NOT EXISTS "MemberDocument_reviewedBy_idx" ON "MemberDocument"("reviewedBy");

-- Update existing documents to APPROVED status (backward compatibility)
-- This assumes existing documents are already approved
UPDATE "MemberDocument" 
SET "uploadStatus" = 'APPROVED'
WHERE "uploadStatus" = 'PENDING_UPLOAD' AND "fileUrl" IS NOT NULL;

