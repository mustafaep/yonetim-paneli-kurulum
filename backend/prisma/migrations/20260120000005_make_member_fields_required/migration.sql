-- AlterTable: Make Member fields required
-- This migration makes the following fields NOT NULL:
-- phone, motherName, fatherName, birthDate, birthplace, gender, educationStatus, provinceId, districtId

-- First, update any NULL values with default values
UPDATE "Member" 
SET "phone" = '905000000000' 
WHERE "phone" IS NULL;

UPDATE "Member" 
SET "motherName" = 'Bilinmiyor' 
WHERE "motherName" IS NULL;

UPDATE "Member" 
SET "fatherName" = 'Bilinmiyor' 
WHERE "fatherName" IS NULL;

UPDATE "Member" 
SET "birthDate" = '1990-01-01'::timestamp 
WHERE "birthDate" IS NULL;

UPDATE "Member" 
SET "birthplace" = 'Bilinmiyor' 
WHERE "birthplace" IS NULL;

UPDATE "Member" 
SET "gender" = 'MALE' 
WHERE "gender" IS NULL;

UPDATE "Member" 
SET "educationStatus" = 'COLLEGE' 
WHERE "educationStatus" IS NULL;

-- For provinceId and districtId, we need to ensure they exist
-- If provinceId is NULL, we'll need to set a default province
-- If districtId is NULL but provinceId exists, set a default district for that province
UPDATE "Member" m
SET "districtId" = (
    SELECT d.id 
    FROM "District" d 
    WHERE d."provinceId" = m."provinceId" 
    LIMIT 1
)
WHERE m."districtId" IS NULL AND m."provinceId" IS NOT NULL;

-- If provinceId is NULL, we need to set a default
-- First, let's get a default province
DO $$
DECLARE
    default_province_id TEXT;
    default_district_id TEXT;
BEGIN
    -- Get first province
    SELECT id INTO default_province_id FROM "Province" LIMIT 1;
    
    IF default_province_id IS NOT NULL THEN
        -- Get first district for that province
        SELECT id INTO default_district_id FROM "District" WHERE "provinceId" = default_province_id LIMIT 1;
        
        -- Update members with NULL provinceId
        UPDATE "Member" 
        SET "provinceId" = default_province_id,
            "districtId" = COALESCE("districtId", default_district_id)
        WHERE "provinceId" IS NULL;
    END IF;
END $$;

-- Now alter the columns to be NOT NULL
ALTER TABLE "Member" 
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "motherName" SET NOT NULL,
ALTER COLUMN "fatherName" SET NOT NULL,
ALTER COLUMN "birthDate" SET NOT NULL,
ALTER COLUMN "birthplace" SET NOT NULL,
ALTER COLUMN "gender" SET NOT NULL,
ALTER COLUMN "educationStatus" SET NOT NULL,
ALTER COLUMN "provinceId" SET NOT NULL,
ALTER COLUMN "districtId" SET NOT NULL;

