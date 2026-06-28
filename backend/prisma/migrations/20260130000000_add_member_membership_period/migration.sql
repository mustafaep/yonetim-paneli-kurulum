-- CreateTable: Üyelik dönemleri (aynı TC ile yeniden üye olma, istifa/ihraç geçmişi)
CREATE TABLE "MemberMembershipPeriod" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberMembershipPeriod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberMembershipPeriod_memberId_idx" ON "MemberMembershipPeriod"("memberId");

ALTER TABLE "MemberMembershipPeriod" ADD CONSTRAINT "MemberMembershipPeriod_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
