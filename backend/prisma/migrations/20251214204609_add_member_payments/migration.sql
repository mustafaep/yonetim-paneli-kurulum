-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TEVKIFAT', 'ELDEN', 'HAVALE');

-- CreateTable
CREATE TABLE "MemberPayment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentPeriodMonth" INTEGER NOT NULL,
    "paymentPeriodYear" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "tevkifatCenterId" TEXT,
    "tevkifatFileId" TEXT,
    "description" TEXT,
    "documentUrl" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberPayment_memberId_idx" ON "MemberPayment"("memberId");

-- CreateIndex
CREATE INDEX "MemberPayment_registrationNumber_idx" ON "MemberPayment"("registrationNumber");

-- CreateIndex
CREATE INDEX "MemberPayment_paymentPeriodYear_paymentPeriodMonth_idx" ON "MemberPayment"("paymentPeriodYear", "paymentPeriodMonth");

-- CreateIndex
CREATE INDEX "MemberPayment_paymentType_idx" ON "MemberPayment"("paymentType");

-- CreateIndex
CREATE INDEX "MemberPayment_isApproved_idx" ON "MemberPayment"("isApproved");

-- CreateIndex
CREATE INDEX "MemberPayment_createdByUserId_idx" ON "MemberPayment"("createdByUserId");

-- CreateIndex
CREATE INDEX "MemberPayment_tevkifatCenterId_idx" ON "MemberPayment"("tevkifatCenterId");

-- CreateIndex
CREATE INDEX "MemberPayment_tevkifatFileId_idx" ON "MemberPayment"("tevkifatFileId");

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_tevkifatCenterId_fkey" FOREIGN KEY ("tevkifatCenterId") REFERENCES "TevkifatCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_tevkifatFileId_fkey" FOREIGN KEY ("tevkifatFileId") REFERENCES "TevkifatFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPayment" ADD CONSTRAINT "MemberPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
