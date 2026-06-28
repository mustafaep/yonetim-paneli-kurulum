/*
  Warnings:

  - A unique constraint covering the columns `[registrationNumber]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationStatus" AS ENUM ('PRIMARY', 'HIGH_SCHOOL', 'COLLEGE');

-- CreateEnum
CREATE TYPE "PositionTitle" AS ENUM ('KADRO_657', 'SOZLESMELI_4B', 'KADRO_663', 'AILE_HEKIMLIGI', 'UNVAN_4924', 'DIGER_SAGLIK_PERSONELI');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('INSTITUTION', 'MEMBER_CREATE', 'MEMBER_UPDATE', 'MEMBER_DELETE');

-- AlterEnum
ALTER TYPE "NotificationTargetType" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "branchSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 40;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "birthplace" TEXT,
ADD COLUMN     "boardDecisionBookNo" TEXT,
ADD COLUMN     "boardDecisionDate" TIMESTAMP(3),
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "educationStatus" "EducationStatus",
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "institutionRegNo" TEXT,
ADD COLUMN     "membershipInfo" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "positionTitle" "PositionTitle",
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "tevkifatCenterId" TEXT,
ADD COLUMN     "workUnit" TEXT,
ADD COLUMN     "workUnitAddress" TEXT,
ADD COLUMN     "workingDistrictId" TEXT,
ADD COLUMN     "workingProvinceId" TEXT;

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "districtId" TEXT,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TevkifatCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TevkifatCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "deletedFields" JSONB,
    "updatedFields" JSONB,
    "changedBy" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "entityType" "ApprovalEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "requestData" JSONB NOT NULL,
    "approvalNote" TEXT,
    "rejectionNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TevkifatFile" (
    "id" TEXT NOT NULL,
    "tevkifatCenterId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "positionTitle" "PositionTitle",
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TevkifatFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipInfoOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipInfoOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNotification_userId_idx" ON "UserNotification"("userId");

-- CreateIndex
CREATE INDEX "UserNotification_isRead_idx" ON "UserNotification"("isRead");

-- CreateIndex
CREATE INDEX "UserNotification_notificationId_idx" ON "UserNotification"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotification_userId_notificationId_key" ON "UserNotification"("userId", "notificationId");

-- CreateIndex
CREATE INDEX "Institution_provinceId_idx" ON "Institution"("provinceId");

-- CreateIndex
CREATE INDEX "Institution_districtId_idx" ON "Institution"("districtId");

-- CreateIndex
CREATE INDEX "Institution_branchId_idx" ON "Institution"("branchId");

-- CreateIndex
CREATE INDEX "Institution_isActive_idx" ON "Institution"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TevkifatCenter_name_key" ON "TevkifatCenter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TevkifatCenter_code_key" ON "TevkifatCenter"("code");

-- CreateIndex
CREATE INDEX "MemberHistory_memberId_idx" ON "MemberHistory"("memberId");

-- CreateIndex
CREATE INDEX "MemberHistory_changedBy_idx" ON "MemberHistory"("changedBy");

-- CreateIndex
CREATE INDEX "MemberHistory_createdAt_idx" ON "MemberHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Approval_entityType_idx" ON "Approval"("entityType");

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_requestedBy_idx" ON "Approval"("requestedBy");

-- CreateIndex
CREATE INDEX "Approval_createdAt_idx" ON "Approval"("createdAt");

-- CreateIndex
CREATE INDEX "TevkifatFile_tevkifatCenterId_idx" ON "TevkifatFile"("tevkifatCenterId");

-- CreateIndex
CREATE INDEX "TevkifatFile_year_month_idx" ON "TevkifatFile"("year", "month");

-- CreateIndex
CREATE INDEX "TevkifatFile_status_idx" ON "TevkifatFile"("status");

-- CreateIndex
CREATE INDEX "TevkifatFile_uploadedBy_idx" ON "TevkifatFile"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipInfoOption_label_key" ON "MembershipInfoOption"("label");

-- CreateIndex
CREATE INDEX "MembershipInfoOption_isActive_idx" ON "MembershipInfoOption"("isActive");

-- CreateIndex
CREATE INDEX "MembershipInfoOption_order_idx" ON "MembershipInfoOption"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Member_registrationNumber_key" ON "Member"("registrationNumber");

-- CreateIndex
CREATE INDEX "Member_registrationNumber_idx" ON "Member"("registrationNumber");

-- CreateIndex
CREATE INDEX "Member_institutionId_idx" ON "Member"("institutionId");

-- CreateIndex
CREATE INDEX "Member_branchId_idx" ON "Member"("branchId");

-- CreateIndex
CREATE INDEX "Member_tevkifatCenterId_idx" ON "Member"("tevkifatCenterId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_workingProvinceId_fkey" FOREIGN KEY ("workingProvinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_workingDistrictId_fkey" FOREIGN KEY ("workingDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_tevkifatCenterId_fkey" FOREIGN KEY ("tevkifatCenterId") REFERENCES "TevkifatCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberHistory" ADD CONSTRAINT "MemberHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberHistory" ADD CONSTRAINT "MemberHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TevkifatFile" ADD CONSTRAINT "TevkifatFile_tevkifatCenterId_fkey" FOREIGN KEY ("tevkifatCenterId") REFERENCES "TevkifatCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TevkifatFile" ADD CONSTRAINT "TevkifatFile_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TevkifatFile" ADD CONSTRAINT "TevkifatFile_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
