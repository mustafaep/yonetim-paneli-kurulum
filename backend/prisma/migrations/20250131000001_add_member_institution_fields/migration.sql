-- CreateTable
CREATE TABLE IF NOT EXISTS "Profession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Profession_name_key" ON "Profession"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Profession_isActive_idx" ON "Profession"("isActive");

-- AlterTable
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "dutyUnit" TEXT;
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "institutionAddress" TEXT;
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "institutionProvinceId" TEXT;
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "institutionDistrictId" TEXT;
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "professionId" TEXT;
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "institutionRegNo" TEXT;
ALTER TABLE IF EXISTS "Member" ADD COLUMN IF NOT EXISTS "staffTitleCode" TEXT;

-- CreateIndex
DO $$
BEGIN
  IF to_regclass('"Member"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Member_professionId_idx" ON "Member"("professionId")';
  END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
  IF to_regclass('"Member"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Member_institutionProvinceId_idx" ON "Member"("institutionProvinceId")';
  END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
  IF to_regclass('"Member"') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Member_institutionDistrictId_idx" ON "Member"("institutionDistrictId")';
  END IF;
END $$;

-- AddForeignKey (IF NOT EXISTS constraint için DO block kullanıyoruz)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_professionId_fkey'
    ) THEN
        IF to_regclass('"Member"') IS NOT NULL AND to_regclass('"Profession"') IS NOT NULL THEN
          ALTER TABLE "Member" ADD CONSTRAINT "Member_professionId_fkey" 
          FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_institutionProvinceId_fkey'
    ) THEN
        IF to_regclass('"Member"') IS NOT NULL AND to_regclass('"Province"') IS NOT NULL THEN
          ALTER TABLE "Member" ADD CONSTRAINT "Member_institutionProvinceId_fkey" 
          FOREIGN KEY ("institutionProvinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Member_institutionDistrictId_fkey'
    ) THEN
        IF to_regclass('"Member"') IS NOT NULL AND to_regclass('"District"') IS NOT NULL THEN
          ALTER TABLE "Member" ADD CONSTRAINT "Member_institutionDistrictId_fkey" 
          FOREIGN KEY ("institutionDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

