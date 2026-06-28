-- CreateEnum
CREATE TYPE "PanelUserApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "userId" TEXT;

-- CreateTable
CREATE TABLE "PanelUserApplication" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "requestedRoleId" TEXT NOT NULL,
    "status" "PanelUserApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "requestNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelUserApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanelUserApplication_memberId_key" ON "PanelUserApplication"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelUserApplication_createdUserId_key" ON "PanelUserApplication"("createdUserId");

-- CreateIndex
CREATE INDEX "PanelUserApplication_memberId_idx" ON "PanelUserApplication"("memberId");

-- CreateIndex
CREATE INDEX "PanelUserApplication_status_idx" ON "PanelUserApplication"("status");

-- CreateIndex
CREATE INDEX "PanelUserApplication_requestedRoleId_idx" ON "PanelUserApplication"("requestedRoleId");

-- CreateIndex
CREATE INDEX "PanelUserApplication_reviewedBy_idx" ON "PanelUserApplication"("reviewedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelUserApplication" ADD CONSTRAINT "PanelUserApplication_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelUserApplication" ADD CONSTRAINT "PanelUserApplication_requestedRoleId_fkey" FOREIGN KEY ("requestedRoleId") REFERENCES "CustomRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelUserApplication" ADD CONSTRAINT "PanelUserApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanelUserApplication" ADD CONSTRAINT "PanelUserApplication_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

