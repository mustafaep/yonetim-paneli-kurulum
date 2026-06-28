-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "previousCancelledMemberId" TEXT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_previousCancelledMemberId_fkey" FOREIGN KEY ("previousCancelledMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
