-- CreateTable: MemberAdvance
CREATE TABLE IF NOT EXISTS "MemberAdvance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "advanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberAdvance_memberId_idx" ON "MemberAdvance"("memberId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberAdvance_registrationNumber_idx" ON "MemberAdvance"("registrationNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberAdvance_year_month_idx" ON "MemberAdvance"("year", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MemberAdvance_createdByUserId_idx" ON "MemberAdvance"("createdByUserId");

-- AddForeignKey
ALTER TABLE "MemberAdvance" ADD CONSTRAINT "MemberAdvance_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAdvance" ADD CONSTRAINT "MemberAdvance_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
