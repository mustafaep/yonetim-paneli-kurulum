-- AlterTable: Add deletedAt, updatedAt to UserScope
ALTER TABLE "UserScope" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "UserScope" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Add onDelete Cascade to foreign keys
ALTER TABLE "UserScope" DROP CONSTRAINT IF EXISTS "UserScope_provinceId_fkey";
ALTER TABLE "UserScope" ADD CONSTRAINT "UserScope_provinceId_fkey" 
  FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserScope" DROP CONSTRAINT IF EXISTS "UserScope_districtId_fkey";
ALTER TABLE "UserScope" ADD CONSTRAINT "UserScope_districtId_fkey" 
  FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "UserScope_userId_idx" ON "UserScope"("userId");
CREATE INDEX IF NOT EXISTS "UserScope_provinceId_idx" ON "UserScope"("provinceId");
CREATE INDEX IF NOT EXISTS "UserScope_districtId_idx" ON "UserScope"("districtId");

-- CreateIndex: Add unique constraint to prevent duplicate scopes
-- First, remove any existing duplicate records (keep the oldest one)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", COALESCE("provinceId", ''), COALESCE("districtId", '') 
      ORDER BY "createdAt" ASC
    ) as row_num
  FROM "UserScope"
  WHERE "deletedAt" IS NULL
)
DELETE FROM "UserScope"
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Now create the unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'UserScope_userId_provinceId_districtId_key'
  ) THEN
    CREATE UNIQUE INDEX "UserScope_userId_provinceId_districtId_key" 
    ON "UserScope"("userId", "provinceId", "districtId") 
    WHERE "deletedAt" IS NULL;
  END IF;
END $$;























