-- AlterTable: MemberMembershipPeriod'a onaylayan ve iptal eden kullanıcı alanları
ALTER TABLE "MemberMembershipPeriod" ADD COLUMN     "approvedByUserId" TEXT;
ALTER TABLE "MemberMembershipPeriod" ADD COLUMN     "cancelledByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "MemberMembershipPeriod" ADD CONSTRAINT "MemberMembershipPeriod_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberMembershipPeriod" ADD CONSTRAINT "MemberMembershipPeriod_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
