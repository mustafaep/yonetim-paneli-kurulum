-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentTemplateType" ADD VALUE 'RESIGNATION_LETTER';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'EXPULSION_LETTER';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'APPROVAL_CERTIFICATE';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'INVITATION_LETTER';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'CONGRATULATION_LETTER';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'WARNING_LETTER';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'NOTIFICATION_LETTER';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'MEMBERSHIP_APPLICATION';
ALTER TYPE "DocumentTemplateType" ADD VALUE 'TRANSFER_CERTIFICATE';
