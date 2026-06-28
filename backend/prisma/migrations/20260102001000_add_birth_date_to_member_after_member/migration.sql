-- AlterTable
-- Ensure birthDate exists after "Member" table is created (fresh installs)
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);


