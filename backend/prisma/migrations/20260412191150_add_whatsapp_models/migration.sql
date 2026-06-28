/*
  Warnings:

  - The values [DEALER] on the enum `MemberSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `address` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `districtId` on the `CustomRole` table. All the data in the column will be lost.
  - You are about to drop the column `provinceId` on the `CustomRole` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `Institution` table. All the data in the column will be lost.
  - You are about to drop the column `positionTitle` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `workUnit` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `workUnitAddress` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `workingDistrictId` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `workingProvinceId` on the `Member` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `TevkifatCenter` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `TevkifatCenter` table. All the data in the column will be lost.
  - You are about to drop the column `dealerId` on the `UserScope` table. All the data in the column will be lost.
  - You are about to drop the `Dealer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,provinceId,districtId]` on the table `UserScope` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum (idempotent: yarım kalan migration denemelerinde tipler DB'de kalabiliyor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'MessageDirection'
  ) THEN
    CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'WhatsAppMessageStatus'
  ) THEN
    CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
  END IF;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "MemberSource_new" AS ENUM ('DIRECT', 'OTHER');
ALTER TABLE "public"."Member" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Member" ALTER COLUMN "source" TYPE "MemberSource_new" USING ("source"::text::"MemberSource_new");
ALTER TYPE "MemberSource" RENAME TO "MemberSource_old";
ALTER TYPE "MemberSource_new" RENAME TO "MemberSource";
DROP TYPE "public"."MemberSource_old";
ALTER TABLE "Member" ALTER COLUMN "source" SET DEFAULT 'DIRECT';
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationTargetType" ADD VALUE 'ROLE';

-- DropForeignKey
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "CustomRole" DROP CONSTRAINT "CustomRole_districtId_fkey";

-- DropForeignKey
ALTER TABLE "CustomRole" DROP CONSTRAINT "CustomRole_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "Dealer" DROP CONSTRAINT "Dealer_districtId_fkey";

-- DropForeignKey
ALTER TABLE "Dealer" DROP CONSTRAINT "Dealer_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "Institution" DROP CONSTRAINT "Institution_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Institution" DROP CONSTRAINT "Institution_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_districtId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_workingDistrictId_fkey";

-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_workingProvinceId_fkey";

-- DropForeignKey
ALTER TABLE "SystemLog" DROP CONSTRAINT "SystemLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserNotification" DROP CONSTRAINT "UserNotification_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserScope" DROP CONSTRAINT "UserScope_dealerId_fkey";

-- DropIndex
DROP INDEX "Branch_code_key";

-- DropIndex
DROP INDEX "Institution_branchId_idx";

-- DropIndex
DROP INDEX "TevkifatCenter_code_key";

-- AlterTable
ALTER TABLE "Branch" DROP COLUMN "address",
DROP COLUMN "code",
DROP COLUMN "email",
DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "CustomRole" DROP COLUMN "districtId",
DROP COLUMN "provinceId";

-- AlterTable
ALTER TABLE "Institution" DROP COLUMN "branchId";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "positionTitle",
DROP COLUMN "workUnit",
DROP COLUMN "workUnitAddress",
DROP COLUMN "workingDistrictId",
DROP COLUMN "workingProvinceId";

-- AlterTable
ALTER TABLE "MemberDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationRecipient" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TevkifatCenter" DROP COLUMN "code",
DROP COLUMN "description";

-- AlterTable
ALTER TABLE "UserNotificationSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserScope" DROP COLUMN "dealerId",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "Dealer";

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "remoteJid" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessage" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "whatsappMsgId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerEvent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_remoteJid_key" ON "WhatsAppConversation"("remoteJid");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_memberId_idx" ON "WhatsAppConversation"("memberId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_lastMessageAt_idx" ON "WhatsAppConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_isArchived_idx" ON "WhatsAppConversation"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_whatsappMsgId_key" ON "WhatsAppMessage"("whatsappMsgId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_createdAt_idx" ON "WhatsAppMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_whatsappMsgId_idx" ON "WhatsAppMessage"("whatsappMsgId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_direction_idx" ON "WhatsAppMessage"("direction");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_key" ON "WhatsAppTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_slug_key" ON "WhatsAppTemplate"("slug");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_slug_idx" ON "WhatsAppTemplate"("slug");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_triggerEvent_idx" ON "WhatsAppTemplate"("triggerEvent");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_isActive_idx" ON "WhatsAppTemplate"("isActive");

-- CreateIndex
CREATE INDEX "Notification_category_idx" ON "Notification"("category");

-- CreateIndex
CREATE INDEX "Notification_typeCategory_idx" ON "Notification"("typeCategory");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_idx" ON "Notification"("scheduledFor");

-- CreateIndex
CREATE INDEX "UserNotification_createdAt_idx" ON "UserNotification"("createdAt");

-- CreateIndex
-- 20260106201139_update_user_scope_model already created this name as a partial unique index (WHERE deletedAt IS NULL).
-- Prisma @@unique([userId, provinceId, districtId]) expects a full unique index; replace in place.
DROP INDEX IF EXISTS "UserScope_userId_provinceId_districtId_key";
CREATE UNIQUE INDEX "UserScope_userId_provinceId_districtId_key" ON "UserScope"("userId", "provinceId", "districtId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRoleScope" ADD CONSTRAINT "CustomRoleScope_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRoleScope" ADD CONSTRAINT "CustomRoleScope_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRoleScope" ADD CONSTRAINT "CustomRoleScope_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PanelUserApplicationScope_applicationId_provinceId_districtId_k" RENAME TO "PanelUserApplicationScope_applicationId_provinceId_district_key";
