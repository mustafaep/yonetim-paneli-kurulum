-- DropForeignKey
ALTER TABLE "UserScope" DROP CONSTRAINT IF EXISTS "UserScope_contractedInstitutionId_fkey";

-- AlterTable - Remove contractedInstitutionId from UserScope
ALTER TABLE "UserScope" DROP COLUMN IF EXISTS "contractedInstitutionId";

-- Delete ANLASMALI_KURUM_YETKILISI role if exists
DELETE FROM "CustomRolePermission" WHERE "roleId" IN (SELECT id FROM "CustomRole" WHERE name = 'ANLASMALI_KURUM_YETKILISI');
DELETE FROM "CustomRole" WHERE name = 'ANLASMALI_KURUM_YETKILISI';

-- AlterEnum - Remove CONTRACTED_INSTITUTION from MemberSource enum
-- Önce bu değeri kullanan üyeleri OTHER olarak değiştir (eğer enum'da varsa)
DO $$ 
BEGIN
    -- Eğer enum'da CONTRACTED_INSTITUTION varsa, önce üyeleri güncelle
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'MemberSource' AND e.enumlabel = 'CONTRACTED_INSTITUTION') THEN
        -- Üyeleri güncelle
        UPDATE "Member" SET source = 'OTHER' WHERE source = 'CONTRACTED_INSTITUTION';
        
        -- Geçici enum oluştur
        CREATE TYPE "MemberSource_new" AS ENUM ('DIRECT', 'WORKPLACE', 'OTHER');
        
        -- Default değeri kaldır
        ALTER TABLE "Member" ALTER COLUMN "source" DROP DEFAULT;
        
        -- Member tablosundaki source kolonunu güncelle
        ALTER TABLE "Member" ALTER COLUMN "source" TYPE "MemberSource_new" USING ("source"::text::"MemberSource_new");
        
        -- Default değeri tekrar ekle
        ALTER TABLE "Member" ALTER COLUMN "source" SET DEFAULT 'DIRECT';
        
        -- Eski enum'u sil
        DROP TYPE "MemberSource";
        
        -- Yeni enum'u eski adıyla yeniden adlandır
        ALTER TYPE "MemberSource_new" RENAME TO "MemberSource";
    END IF;
END $$;

-- DropTable - Remove ContractedInstitution table
DROP TABLE IF EXISTS "ContractedInstitution";
