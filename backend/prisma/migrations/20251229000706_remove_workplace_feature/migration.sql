-- AlterEnum: Remove WORKPLACE from MemberSource enum
-- First, update existing records that use WORKPLACE to DIRECT
UPDATE "Member" SET "source" = 'DIRECT' WHERE "source" = 'WORKPLACE';

-- AlterEnum requires creating new enum type without WORKPLACE
-- Note: Including DEALER in the new enum as it might exist in the database
DO $$
BEGIN
    -- Check if DEALER exists in current enum
    IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid 
               WHERE t.typname = 'MemberSource' AND e.enumlabel = 'DEALER') THEN
        -- Create new enum with DEALER included
        CREATE TYPE "MemberSource_new" AS ENUM ('DIRECT', 'DEALER', 'OTHER');
    ELSE
        -- Create new enum without DEALER
        CREATE TYPE "MemberSource_new" AS ENUM ('DIRECT', 'OTHER');
    END IF;
END $$;

ALTER TABLE "Member" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Member" ALTER COLUMN "source" TYPE "MemberSource_new" USING ("source"::text::"MemberSource_new");
ALTER TYPE "MemberSource" RENAME TO "MemberSource_old";
ALTER TYPE "MemberSource_new" RENAME TO "MemberSource";
DROP TYPE "MemberSource_old";
ALTER TABLE "Member" ALTER COLUMN "source" SET DEFAULT 'DIRECT';

-- AlterEnum: Remove ISYERI_TEMSILCISI from Role enum
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MODERATOR', 'GENEL_BASKAN', 'GENEL_BASKAN_YRD', 'GENEL_SEKRETER', 'IL_BASKANI', 'ILCE_TEMSILCISI', 'UYE');
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

-- AlterEnum: Remove ANNOUNCEMENT_WORKPLACE from NotificationTypeCategory enum
-- NOTE:
-- On fresh installs in this repo, the Notification table exists but the "typeCategory" column
-- may be added later (see 20260102009000_fix_notification_schema_drift).
-- Also, the NotificationTypeCategory enum might not exist yet at this point.
-- Guard this enum transformation so it doesn't fail on new databases.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'NotificationTypeCategory'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Notification' AND column_name = 'typeCategory'
  ) THEN
    CREATE TYPE "NotificationTypeCategory_new" AS ENUM (
      'MEMBER_APPLICATION_NEW',
      'MEMBER_APPLICATION_APPROVED',
      'MEMBER_APPLICATION_REJECTED',
      'ROLE_CHANGED',
      'SCOPE_ASSIGNED',
      'PASSWORD_RESET',
      'ACCOUNT_ACTIVATED',
      'ACCOUNT_DEACTIVATED',
      'DUES_PAYMENT_RECEIVED',
      'DUES_OVERDUE',
      'DUES_BULK_REPORT_READY',
      'ACCOUNTING_APPROVAL_PENDING',
      'ANNOUNCEMENT_GENERAL',
      'ANNOUNCEMENT_REGIONAL',
      'ANNOUNCEMENT_ELECTION',
      'REMINDER_DUES_PAYMENT',
      'REMINDER_DOCUMENT_MISSING',
      'REMINDER_REPRESENTATIVE_TERM_EXPIRING',
      'REMINDER_PENDING_APPROVAL'
    );

    -- Update any existing records that use ANNOUNCEMENT_WORKPLACE
    UPDATE "Notification"
    SET "typeCategory" = 'ANNOUNCEMENT_GENERAL'
    WHERE "typeCategory" = 'ANNOUNCEMENT_WORKPLACE';

    ALTER TABLE "Notification" ALTER COLUMN "typeCategory" DROP DEFAULT;
    ALTER TABLE "Notification" ALTER COLUMN "typeCategory" TYPE "NotificationTypeCategory_new"
      USING ("typeCategory"::text::"NotificationTypeCategory_new");

    ALTER TYPE "NotificationTypeCategory" RENAME TO "NotificationTypeCategory_old";
    ALTER TYPE "NotificationTypeCategory_new" RENAME TO "NotificationTypeCategory";
    DROP TYPE "NotificationTypeCategory_old";
  END IF;
END $$;

-- DropForeignKey: Remove workplace foreign key from UserScope
ALTER TABLE "UserScope" DROP CONSTRAINT IF EXISTS "UserScope_workplaceId_fkey";

-- AlterTable: Remove workplaceId from UserScope
ALTER TABLE "UserScope" DROP COLUMN IF EXISTS "workplaceId";

-- DropTable: Drop Workplace table
DROP TABLE IF EXISTS "Workplace" CASCADE;

